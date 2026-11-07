import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import test from 'node:test';

const BOT_TOKEN = '123456789:test-token-for-auth-tests';
const SESSION_SECRET = 'test-session-secret-with-enough-entropy';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const TELEGRAM_ID = 987654321;

const env = {
  TELEGRAM_BOT_TOKEN: BOT_TOKEN,
  OTTO_SESSION_SECRET: SESSION_SECRET,
  OTTO_SUPABASE_URL: 'https://supabase.example.test',
  OTTO_SUPABASE_ANON_KEY: 'anon-test',
  OTTO_SUPABASE_TOKEN: 'service-test',
};

globalThis.Netlify = {
  env: {
    get(name) {
      return env[name] || '';
    },
  },
  context: {},
};

const {
  verifyTelegramInitData,
  verifyTelegramLoginData,
} = await import('../netlify/lib/telegram-access.js');

const sessionModule = await import('../netlify/functions/session.js');

function telegramLoginPayload(overrides = {}) {
  const payload = {
    id: TELEGRAM_ID,
    first_name: 'Otto',
    username: 'otto_test',
    auth_date: Math.floor(Date.now() / 1000),
    ...overrides,
  };

  const dataCheckString = Object.entries(payload)
    .filter(([, value]) => value !== undefined && value !== null && String(value) !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('\n');

  const secret = createHash('sha256').update(BOT_TOKEN).digest();
  const hash = createHmac('sha256', secret)
    .update(dataCheckString)
    .digest('hex');

  return { ...payload, hash };
}

function telegramMiniAppInitData() {
  const params = new URLSearchParams();
  params.set('auth_date', String(Math.floor(Date.now() / 1000)));
  params.set('query_id', 'test-query');
  params.set('user', JSON.stringify({
    id: TELEGRAM_ID,
    first_name: 'Otto',
    username: 'otto_test',
  }));

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secret = createHmac('sha256', 'WebAppData')
    .update(BOT_TOKEN)
    .digest();

  params.set(
    'hash',
    createHmac('sha256', secret)
      .update(dataCheckString)
      .digest('hex'),
  );

  return params.toString();
}

test('valid Telegram Login Widget payload is accepted', () => {
  const user = verifyTelegramLoginData(telegramLoginPayload());
  assert.equal(user?.id, TELEGRAM_ID);
  assert.equal(user?.first_name, 'Otto');
});

test('tampered Telegram Login Widget payload is rejected', () => {
  const payload = telegramLoginPayload();
  payload.first_name = 'Mallory';
  assert.equal(verifyTelegramLoginData(payload), null);
});

test('valid Telegram Mini App initData is accepted', () => {
  const user = verifyTelegramInitData(telegramMiniAppInitData());
  assert.equal(user?.id, TELEGRAM_ID);
});

test('tampered Telegram Mini App initData is rejected', () => {
  const params = new URLSearchParams(telegramMiniAppInitData());
  params.set('user', JSON.stringify({ id: TELEGRAM_ID + 1, first_name: 'Otto' }));
  assert.equal(verifyTelegramInitData(params.toString()), null);
});

test('Telegram browser auth creates an OTTO session cookie and restores it', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, options = {}) => {
    const url = String(input);

    if (url.includes('/rest/v1/user_identities?')) {
      if (url.includes('select=provider_user_id')) {
        return new Response(JSON.stringify([
          { provider_user_id: String(TELEGRAM_ID) },
        ]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (url.endsWith('/rest/v1/rpc/resolve_telegram_user')) {
      assert.equal(options.method, 'POST');
      return new Response(JSON.stringify([
        { user_id: USER_ID, created: true },
      ]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    throw new Error(`Unexpected fetch in auth test: ${url}`);
  };

  try {
    const loginResponse = await sessionModule.default(
      new Request('https://otto.example/api/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          telegramAuth: telegramLoginPayload(),
          createIfMissing: true,
        }),
      }),
    );

    assert.equal(loginResponse.status, 200);
    const loginBody = await loginResponse.json();
    assert.equal(loginBody.authenticated, true);
    assert.equal(loginBody.created, true);
    assert.equal(loginBody.telegramUserId, TELEGRAM_ID);

    const setCookie = loginResponse.headers.get('set-cookie') || '';
    assert.match(setCookie, /^otto_session=/u);
    assert.match(setCookie, /HttpOnly/u);
    assert.match(setCookie, /Secure/u);
    assert.match(setCookie, /SameSite=Lax/u);

    const cookiePair = setCookie.split(';', 1)[0];
    const restoredResponse = await sessionModule.default(
      new Request('https://otto.example/api/session', {
        method: 'GET',
        headers: { cookie: cookiePair },
      }),
    );

    assert.equal(restoredResponse.status, 200);
    assert.deepEqual(await restoredResponse.json(), {
      authenticated: true,
      userId: USER_ID,
      telegramUserId: TELEGRAM_ID,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});



test('existing Mini App Telegram identity restores OTTO session without signup', async () => {
  const originalFetch = globalThis.fetch;
  let resolverCalled = false;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url.includes('/rest/v1/user_identities?')) {
      if (url.includes('select=user_id')) {
        return new Response(JSON.stringify([
          { user_id: USER_ID },
        ]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (url.includes('select=provider_user_id')) {
        return new Response(JSON.stringify([
          { provider_user_id: String(TELEGRAM_ID) },
        ]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
    }

    if (url.endsWith('/rest/v1/rpc/resolve_telegram_user')) {
      resolverCalled = true;
      throw new Error('Existing Mini App identity must not be recreated.');
    }

    throw new Error(`Unexpected fetch in Mini App restore test: ${url}`);
  };

  try {
    const response = await sessionModule.default(
      new Request('https://otto.example/api/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          initData: telegramMiniAppInitData(),
          createIfMissing: false,
        }),
      }),
    );

    assert.equal(response.status, 200);
    assert.equal(resolverCalled, false);
    const payload = await response.json();
    assert.equal(payload.authenticated, true);
    assert.equal(payload.userId, USER_ID);
    assert.equal(payload.telegramUserId, TELEGRAM_ID);
    assert.equal(payload.created, false);

    const setCookie = response.headers.get('set-cookie') || '';
    const cookiePair = setCookie.split(';', 1)[0];

    const restored = await sessionModule.default(
      new Request('https://otto.example/api/session', {
        method: 'GET',
        headers: { cookie: cookiePair },
      }),
    );

    assert.equal(restored.status, 200);
    assert.deepEqual(await restored.json(), {
      authenticated: true,
      userId: USER_ID,
      telegramUserId: TELEGRAM_ID,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('automatic Mini App restore does not create a separate Telegram account', async () => {
  const originalFetch = globalThis.fetch;
  let resolverCalled = false;

  globalThis.fetch = async (input) => {
    const url = String(input);

    if (url.includes('/rest/v1/user_identities?')) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (url.endsWith('/rest/v1/rpc/resolve_telegram_user')) {
      resolverCalled = true;
      throw new Error('Telegram account creation must not run during restore-only bootstrap.');
    }

    throw new Error(`Unexpected fetch in restore-only test: ${url}`);
  };

  try {
    const response = await sessionModule.default(
      new Request('https://otto.example/api/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          initData: telegramMiniAppInitData(),
          createIfMissing: false,
        }),
      }),
    );

    assert.equal(response.status, 404);
    assert.equal(resolverCalled, false);
    assert.deepEqual(await response.json(), {
      authenticated: false,
      code: 'account_not_found',
      telegramUserId: TELEGRAM_ID,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
