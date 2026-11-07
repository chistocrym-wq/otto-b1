import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceLoader } from './helpers/module-loader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const USER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const TELEGRAM = '1250950686';
const EMAIL = 'new@example.test';
const ORIGIN = 'https://otto.example.test';
const plain = (value) => JSON.parse(JSON.stringify(value));
const tick = () => new Promise(setImmediate);

async function backend(initial = [{ user_id: USER, provider: 'telegram', provider_user_id: TELEGRAM, verified_at: '2026-09-26' }]) {
  const rows = structuredClone(initial);
  const storage = new Map();
  const writes = [];
  const mails = [];
  const env = {
    OTTO_SESSION_SECRET: 'local-test-secret',
    OTTO_SUPABASE_URL: 'https://database.example.test',
    OTTO_SUPABASE_ANON_KEY: 'test-anon', OTTO_SUPABASE_TOKEN: 'test-token',
    UNISENDER_GO_API_KEY: 'test-mail-key', UNISENDER_FROM_EMAIL: 'sender@example.test',
  };
  const options = { mailFails: false, dbFails: false, staleUpdate: false, uniqueViolation: false };
  const getStore = (name) => ({
    async get(key) { return structuredClone(storage.get(`${name}/${key}`) ?? null); },
    async getWithMetadata(key) { const data = storage.get(`${name}/${key}`); return data ? { data: structuredClone(data), etag: JSON.stringify(data) } : null; },
    async setJSON(key, value, options = {}) {
      const current = storage.get(`${name}/${key}`);
      if (options.onlyIfMatch && JSON.stringify(current) !== options.onlyIfMatch) return { modified: false };
      if (options.onlyIfNew && current) return { modified: false };
      storage.set(`${name}/${key}`, structuredClone(value));
      return { modified: true, etag: JSON.stringify(value) };
    },
    async delete(key) { storage.delete(`${name}/${key}`); },
  });
  const loader = sourceLoader(ROOT, {
    Netlify: { env: { get: (key) => env[key] || '' }, context: { deploy: { context: 'production' } } },
    console: { ...console, error: () => {} },
    fetch: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === 'goapi.unisender.ru') {
        mails.push(JSON.parse(init.body));
        return Response.json({ status: options.mailFails ? 'error' : 'success', job_id: 'local-job' });
      }
      assert.equal(url.origin, env.OTTO_SUPABASE_URL);
      // Reject any accidental signup resolver/user creation immediately.
      assert.equal(url.pathname, '/rest/v1/user_identities');
      const method = init.method || 'GET';
      const matched = rows.filter((row) => ['user_id', 'provider', 'provider_user_id'].every((key) => {
        const filter = url.searchParams.get(key);
        return !filter || row[key] === filter.slice(3);
      }));
      if (method === 'GET') {
        const filtered = url.searchParams.get('verified_at') === 'not.is.null'
          ? matched.filter((row) => row.verified_at) : matched;
        return Response.json(filtered.slice(0, Number(url.searchParams.get('limit') || 100)));
      }
      const body = JSON.parse(init.body);
      writes.push({ method, params: Object.fromEntries(url.searchParams), body, headers: init.headers });
      if (options.dbFails) return Response.json({ code: '42501', message: 'permission denied' }, { status: 403 });
      if (options.uniqueViolation) return Response.json({ code: '23505' }, { status: 409 });
      if (method === 'POST') {
        assert.equal(body.provider, 'email');
        assert.equal(url.searchParams.has('on_conflict'), false);
        rows.push(body);
        return Response.json([body], { status: 201 });
      }
      assert.equal(method, 'PATCH');
      assert.equal(body.user_id, undefined);
      assert.equal(url.searchParams.get('provider'), 'eq.email');
      if (options.staleUpdate) return Response.json([]);
      matched.forEach((row) => Object.assign(row, body));
      return Response.json(matched);
    },
  }, { '@netlify/blobs': { getStore, getDeployStore: getStore } });
  const session = await loader.load('netlify/lib/otto-session.js');
  const handler = (await loader.load('netlify/functions/profile-email.js')).default;
  const otp = await loader.load('netlify/lib/email-otp.js');
  const identity = await loader.load('netlify/lib/profile-email.js');
  const cookie = (id = USER) => session.createSessionCookie(id).split(';')[0];
  const request = (body, { user = USER, route = '/api/profile-email', ...extra } = {}) => new Request(ORIGIN + route, {
    method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN, ...(user ? { cookie: cookie(user) } : {}), ...extra },
    body: JSON.stringify(body),
  });
  async function send(email = EMAIL, settings) {
    const response = await handler(request({ action: 'request', email }, settings));
    const body = await response.json();
    const code = mails.at(-1)?.message.body.plaintext.match(/\d{6}/u)?.[0];
    return { response, body, code };
  }
  async function verify(challenge, email = EMAIL, settings) {
    return handler(request({ action: 'verify', email, challengeId: challenge.body.challengeId, code: challenge.code }, settings));
  }
  return { rows, writes, mails, storage, options, env, loader, otp, identity, handler, request, send, verify };
}

test('authenticated Telegram profile sends OTP without registration consent', async () => {
  const b = await backend();
  const sent = await b.send();
  assert.equal(sent.response.status, 200);
  assert.match(sent.body.challengeId, /^[0-9a-f-]+$/u);
  assert.equal(b.mails.length, 1);
  assert.equal(b.writes.length, 0);
  const record = b.storage.get(`otto-email-otp/challenge:${sent.body.challengeId}`);
  assert.deepEqual(record.context, { purpose: 'profile-email', userId: USER });
  assert.equal(sent.body.code, undefined);
});

test('verified email is inserted for the same UUID without touching Telegram or session', async () => {
  const b = await backend();
  const telegramBefore = structuredClone(b.rows[0]);
  const res = await b.verify(await b.send());
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { verified: true, userId: USER });
  assert.equal(res.headers.has('set-cookie'), false);
  assert.deepEqual(b.rows[0], telegramBefore);
  assert.equal(b.rows[1].user_id, USER);
  assert.equal(b.rows[1].provider_user_id, EMAIL);
  assert.equal(b.writes.length, 1);
});

test('email-only account changes its identity without signup or a different UUID', async () => {
  const b = await backend([{ user_id: USER, provider: 'email', provider_user_id: 'old@example.test', verified_at: '2026-09-26' }]);
  assert.equal((await b.verify(await b.send())).status, 200);
  assert.equal(b.rows.length, 1);
  assert.equal(b.rows[0].user_id, USER);
  assert.equal(b.rows[0].provider_user_id, EMAIL);
  assert.deepEqual(b.writes[0].params, {
    user_id: `eq.${USER}`, provider: 'eq.email', provider_user_id: 'eq.old@example.test',
  });
});

test('profile OTP cannot be consumed by another authenticated user', async () => {
  const b = await backend(); const sent = await b.send();
  assert.equal((await b.verify(sent, EMAIL, { user: OTHER })).status, 400);
  assert.equal(b.writes.length, 0);
  assert.equal((await b.verify(sent)).status, 200);
});

test('profile OTP cannot be used by the registration/login verify handler', async () => {
  const b = await backend(); const sent = await b.send();
  const authVerify = (await b.loader.load('netlify/functions/email-otp-verify.js')).default;
  const res = await authVerify(b.request({ email: EMAIL, challengeId: sent.body.challengeId, code: sent.code }));
  assert.equal(res.status, 400);
  assert.equal(b.writes.length, 0);
  assert.equal((await b.verify(sent)).status, 200);
});

test('registration challenge cannot be used for an authenticated email change', async () => {
  const b = await backend();
  const challenge = await b.otp.createChallenge(EMAIL, b.env.UNISENDER_GO_API_KEY);
  await b.otp.activateChallenge(EMAIL, challenge.challengeId);
  const res = await b.handler(b.request({ action: 'verify', email: EMAIL, challengeId: challenge.challengeId, code: challenge.code }));
  assert.equal(res.status, 400);
  assert.equal(b.writes.length, 0);
  assert.equal((await b.otp.verifyChallenge({ ...challenge, email: EMAIL, apiKey: b.env.UNISENDER_GO_API_KEY })).ok, true);
});

test('legacy challenges with no context field still verify for auth', async () => {
  const b = await backend(); const challenge = await b.otp.createChallenge(EMAIL, b.env.UNISENDER_GO_API_KEY);
  const key = `otto-email-otp/challenge:${challenge.challengeId}`;
  const record = b.storage.get(key); delete record.context; b.storage.set(key, record);
  assert.equal((await b.otp.verifyChallenge({ ...challenge, email: EMAIL, apiKey: b.env.UNISENDER_GO_API_KEY })).ok, true);
});

test('unauthenticated requests cannot bypass consent through the profile endpoint', async () => {
  const b = await backend();
  const sent = await b.send(EMAIL, { user: null });
  assert.equal(sent.response.status, 401);
  assert.equal(b.mails.length, 0);
});

test('signup still requires consent and still sends with valid consent', async () => {
  const b = await backend(); const register = (await b.loader.load('netlify/functions/email-otp-request.js')).default;
  const res = await register(b.request({ email: EMAIL }));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).code, 'legal_consent_required');
  const ok = await register(b.request({ email: EMAIL, intent: 'register', legalAcceptance: { accepted: true, documentVersion: '2026-09-23-v1' } }));
  assert.equal(ok.status, 200);
  assert.equal(b.mails.length, 1);
});

test('numeric Telegram ID is rejected before email delivery', async () => {
  const b = await backend(); assert.equal((await b.send(TELEGRAM)).response.status, 400);
  assert.equal(b.mails.length, 0);
});

test('email is normalized before sending and saving', async () => {
  const b = await backend(); const sent = await b.send(' New@Example.Test ');
  assert.equal(b.mails[0].message.recipients[0].email, EMAIL);
  assert.equal((await b.verify(sent, ' New@Example.Test ')).status, 200);
  assert.equal(b.rows[1].provider_user_id, EMAIL);
});

test('cross-origin requests are rejected', async () => {
  const b = await backend(); assert.equal((await b.send(EMAIL, { origin: 'https://other.example.test' })).response.status, 403);
  assert.equal(b.mails.length, 0);
});

test('rate limit remains enforced', async () => {
  const b = await backend(); await b.send();
  assert.equal((await b.send()).response.status, 429);
  assert.equal(b.mails.length, 1);
});

test('delivery failure returns 502 and removes the unusable challenge', async () => {
  const b = await backend(); b.options.mailFails = true;
  const sent = await b.send();
  assert.equal(sent.response.status, 502);
  assert.equal(sent.body.code, 'send_failed');
  assert.equal([...b.storage.keys()].some((key) => key.includes('/challenge:')), false);
});

for (const verified_at of ['2026-09-26', null]) {
  test(`another account's ${verified_at ? 'verified' : 'unverified'} email is never reassigned`, async () => {
    const b = await backend([{ user_id: OTHER, provider: 'email', provider_user_id: EMAIL, verified_at }]);
    const res = await b.verify(await b.send());
    assert.equal(res.status, 409);
    assert.equal((await res.json()).code, 'email_in_use');
    assert.equal(b.writes.length, 0);
    assert.equal(b.rows[0].user_id, OTHER);
  });
}

test('concurrent unique violation fails closed without merge/upsert', async () => {
  const b = await backend(); b.options.uniqueViolation = true;
  assert.equal((await b.verify(await b.send())).status, 409);
  assert.equal(b.rows.length, 1);
});

test('an email identity changed during verification is not silently overwritten', async () => {
  const b = await backend([{ user_id: USER, provider: 'email', provider_user_id: 'old@example.test', verified_at: '2026-09-26' }]);
  b.options.staleUpdate = true;
  assert.equal((await b.verify(await b.send())).status, 409);
  assert.equal(b.rows[0].provider_user_id, 'old@example.test');
});

test('ambiguous multiple email identities are not merged or deleted', async () => {
  const b = await backend(['first@example.test', 'second@example.test'].map((email) => ({
    user_id: USER, provider: 'email', provider_user_id: email, verified_at: '2026-09-26',
  })));
  assert.equal((await b.verify(await b.send())).status, 409);
  assert.equal(b.writes.length, 0);
});

test('insufficient database privileges report a failure, never a false success', async () => {
  const b = await backend(); b.options.dbFails = true;
  const res = await b.verify(await b.send());
  assert.equal(res.status, 503);
  assert.equal((await res.json()).code, 'profile_email_failed');
  assert.equal(b.rows.length, 1);
});

// Small hook/JSX harness: execute the actual TSX component's state transitions
// and event handlers, not a second copy of its contact-selection implementation.
async function editor(profile, fetch) {
  const states = []; let cursor = 0; let saved = null;
  const useState = (initial) => {
    const index = cursor++;
    if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
    return [states[index], (value) => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
  };
  const jsx = (type, props) => ({ type, props: props || {} });
  const loader = sourceLoader(ROOT, { fetch, window: { setTimeout: () => 0 } }, {
    react: { useState, useMemo: (fn) => fn(), useRef: (value) => useState({ current: value })[0] },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'lucide-react': Object.fromEntries(['ArrowLeft', 'CheckCircle2', 'Mail', 'Send'].map((name) => [name, name])),
    '@/hooks/useAccess': { useAccess: () => ({ status: { authenticated: true, telegramUserId: Number(TELEGRAM) } }) },
  });
  const { ProfileEditor } = await loader.load('src/components/ProfileEditor.tsx');
  const render = () => { cursor = 0; return ProfileEditor({ profile, onSave: (draft) => { saved = plain(draft); }, onCancel() {} }); };
  return { render, saved: () => saved };
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join('');
  if (typeof tree === 'string') return tree;
  return tree && typeof tree === 'object' ? text(tree.props?.children) : '';
}
const emailInput = (tree) => nodes(tree).find((node) => node.type === 'input' && node.props.inputMode === 'email');
const byText = (tree, label) => nodes(tree).find((node) => node.type === 'button' && text(node) === label);
const telegramProfile = { name: 'Otto', contactType: 'telegram', contact: TELEGRAM, contactVerified: true, authStatus: 'verified', learningMode: 'guided' };

test('actual ProfileEditor: Telegram -> Email opens an empty field', async () => {
  const ui = await editor(telegramProfile, async () => { throw new Error('unexpected fetch'); });
  assert.equal(emailInput(ui.render()), undefined);
  byText(ui.render(), 'Email').props.onClick();
  assert.equal(emailInput(ui.render()).props.value, '');
  byText(ui.render(), 'Telegram').props.onClick();
  byText(ui.render(), 'Email').props.onClick();
  assert.equal(emailInput(ui.render()).props.value, '');
});

test('malformed numeric email profile cannot initialize the Email input or send an OTP', async () => {
  const ui = await editor({ ...telegramProfile, contactType: 'email' }, async () => { throw new Error('must not send'); });
  assert.equal(emailInput(ui.render()).props.value, '');
  emailInput(ui.render()).props.onChange({ target: { value: TELEGRAM } });
  assert.equal(nodes(ui.render()).some((n) => n.type === 'button' && text(n).includes('\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c \u043d\u043e\u0432\u044b\u0439 email')), false);
});

test('actual ProfileEditor: a real email is preserved across contact switches', async () => {
  const ui = await editor({ ...telegramProfile, contactType: 'email', contact: ' Real@Example.Test ' }, async () => {});
  assert.equal(emailInput(ui.render()).props.value, 'real@example.test');
  byText(ui.render(), 'Telegram').props.onClick();
  byText(ui.render(), 'Email').props.onClick();
  assert.equal(emailInput(ui.render()).props.value, 'real@example.test');
});

test('component -> authenticated request -> OTP -> same-user email -> profile save', async () => {
  const b = await backend(); const requests = [];
  const ui = await editor(telegramProfile, async (url, init) => {
    assert.equal(url, '/api/profile-email');
    assert.equal(init.credentials, 'same-origin');
    const body = JSON.parse(init.body); requests.push(body);
    assert.equal(body.initData, undefined);
    assert.equal(body.legalAcceptance, undefined);
    return b.handler(b.request(body));
  });
  byText(ui.render(), 'Email').props.onClick();
  emailInput(ui.render()).props.onChange({ target: { value: EMAIL } });
  byText(ui.render(), '\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044c \u043d\u043e\u0432\u044b\u0439 email').props.onClick();
  await tick();
  assert.deepEqual(requests[0], { action: 'request', email: EMAIL });
  assert.equal(b.mails.length, 1);
  const code = b.mails[0].message.body.plaintext.match(/\d{6}/u)[0];
  const inputs = nodes(ui.render()).filter((n) => n.type === 'input' && n.props.inputMode === 'numeric');
  assert.equal(inputs.length, 6);
  code.split('').forEach((digit, index) => inputs[index].props.onChange({ target: { value: digit } }));
  byText(ui.render(), '\u041f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u043a\u043e\u0434').props.onClick();
  await tick();
  const save = byText(ui.render(), '\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c');
  assert.equal(save.props.disabled, false);
  save.props.onClick();
  assert.equal(ui.saved().contactType, 'email');
  assert.equal(ui.saved().contact, EMAIL);
  assert.equal(ui.saved().contactVerified, true);
  assert.equal(b.rows.find((row) => row.provider === 'email').user_id, USER);
});


// Regression: login must not depend on optional guest/referral services.
// This uses the real Email handler with synthetic dependencies only.
async function loginGuardFixture({ signedGuest = false, referralEnabled = false, failGuestLink = false } = {}) {
  const calls = { verifiedAt: 0, guestLink: [], teacher: 0 };
  const verifiedAt = '2026-10-26T00:00:00.000Z';
  const loader = sourceLoader(ROOT, {
    console: { ...console, error() {} },
  }, {
    '../lib/email-otp.js': {
      env: (name) => name === 'UNISENDER_GO_API_KEY' ? 'synthetic-mail-key' : '',
      normalizeEmail: (value) => String(value || '').trim().toLowerCase(),
      isValidEmail: (value) => value === EMAIL,
      verifyChallenge: async () => ({ ok: true }),
      json: (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
        status, headers: { 'content-type': 'application/json', ...headers },
      }),
    },
    '../lib/telegram-access.js': { verifyTelegramInitData: () => null },
    '../lib/otto-supabase.js': {
      OTTO_LEGAL_VERSION: '2026-09-23-v1',
      resolveVerifiedUser: async () => USER,
      getOttoVerifiedTelegramId: async () => null,
      getOttoAccountVerifiedAt: async () => { calls.verifiedAt++; return verifiedAt; },
      touchOttoUserSession: async () => {},
      saveOttoLegalAcceptance: async () => {},
    },
    '../lib/otto-session.js': {
      readSession: () => null,
      createSessionCookie: () => 'otto_session=synthetic; Path=/; HttpOnly; Secure; SameSite=Lax',
    },
    '../lib/preview20-guest-trial.js': {
      preview20Guest: {
        hasGuestCookie: () => signedGuest,
        linkNewRegistration: async (_req, _context, userId, when) => {
          calls.guestLink.push({ userId, when });
          if (failGuestLink) throw new Error('synthetic guest Blob outage');
          return true;
        },
      },
    },
    '../lib/preview20-teachers.js': {
      teacherPilot: {
        linkVerifiedUser: async () => { calls.teacher++; throw new Error('synthetic referral outage'); },
      },
    },
    '../lib/v20-deployment.js': {
      v20FeatureScope: (_req, _context, feature) =>
        referralEnabled && feature === 'REFERRAL' ? { mode: 'preview' } : null,
    },
  });
  const handler = (await loader.load('netlify/functions/email-otp-verify.js')).default;
  const request = () => new Request('https://otto-a1.netlify.app/api/email-otp-verify', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, challengeId: 'synthetic-id', code: '123456' }),
  });
  return { calls, handler, request, verifiedAt };
}

test('normal Email OTP login succeeds without guest/referral queries or stores', async () => {
  const f = await loginGuardFixture({ signedGuest: false, failGuestLink: true });
  const response = await f.handler(f.request(), { deploy: { context: 'production', id: 'synthetic-prod' } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).userId, USER);
  assert.match(response.headers.get('set-cookie') || '', /^otto_session=synthetic/u);
  assert.deepEqual(f.calls, { verifiedAt: 0, guestLink: [], teacher: 0 });
});

test('real signed guest conversion links trial anchor, without changing standard login', async () => {
  const f = await loginGuardFixture({ signedGuest: true });
  const response = await f.handler(f.request(), { deploy: { context: 'deploy-preview', id: 'synthetic-pr20' } });
  assert.equal(response.status, 200);
  assert.deepEqual(f.calls.guestLink, [{ userId: USER, when: f.verifiedAt }]);
  assert.equal(f.calls.verifiedAt, 1);
  assert.equal(f.calls.teacher, 0);
});

test('guest conversion refuses to grant a fresh trial if linking fails', async () => {
  const f = await loginGuardFixture({ signedGuest: true, failGuestLink: true });
  const response = await f.handler(f.request(), { deploy: { context: 'deploy-preview', id: 'synthetic-pr20' } });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, 'guest_trial_link_unavailable');
  assert.equal(response.headers.has('set-cookie'), false);
});

test('referral attribution failure never blocks registered Email login', async () => {
  const f = await loginGuardFixture({ signedGuest: false, referralEnabled: true });
  const response = await f.handler(f.request(), { deploy: { context: 'deploy-preview', id: 'synthetic-pr20' } });
  assert.equal(response.status, 200);
  assert.equal(f.calls.teacher, 1);
  assert.equal(f.calls.verifiedAt, 1);
});


// Telegram onboarding must be independent of Preview20 optional stores in
// Production, just like the normal Email OTP path. Synthetic test identities;
// no Netlify/Telegram/Supabase account or Blob is accessed.
async function telegramSignupGuardFixture({
  existingIdentity = false, signedGuest = false, referralEnabled = false,
  failVerifiedAt = false, failGuestLink = false,
} = {}) {
  const calls = { resolve: 0, verifiedAt: 0, guestLinks: [], referralLinks: 0 };
  const verifiedAt = '2026-10-26T00:00:00.000Z';
  const tgId = 123456789;
  const loader = sourceLoader(ROOT, { console: { ...console, error() {}, warn() {} } }, {
    '../lib/email-otp.js': {
      json: (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
        status, headers: { 'content-type': 'application/json', ...headers },
      }),
    },
    '../lib/otto-supabase.js': {
      findUserByTelegramId: async (id) => {
        assert.equal(id, tgId);
        return existingIdentity ? USER : null;
      },
      resolveTelegramUser: async (id) => {
        assert.equal(id, tgId);
        calls.resolve++;
        return { userId: USER, created: true };
      },
      getOttoAccountVerifiedAt: async (id) => {
        assert.equal(id, USER);
        calls.verifiedAt++;
        if (failVerifiedAt) throw new Error('optional lookup unavailable');
        return verifiedAt;
      },
      getOttoVerifiedEmail: async () => null,
      getOttoVerifiedTelegramId: async () => String(tgId),
      touchOttoUserSession: async () => {},
    },
    '../lib/telegram-access.js': {
      verifyTelegramInitData: () => ({ id: tgId, first_name: 'Otto' }),
      verifyTelegramLoginData: () => ({ id: tgId, first_name: 'Otto' }),
    },
    '../lib/otto-session.js': {
      readSession: () => null,
      createSessionCookie: () => 'otto_session=synthetic; Path=/; HttpOnly; Secure; SameSite=Lax',
      clearSessionCookie: () => 'otto_session=; Max-Age=0',
    },
    '../lib/preview20-guest-trial.js': {
      preview20Guest: {
        hasGuestCookie: () => signedGuest,
        linkNewRegistration: async (_req, _context, id, when) => {
          calls.guestLinks.push({ id, when });
          if (failGuestLink) throw new Error('guest linkage unavailable');
          return true;
        },
      },
    },
    '../lib/preview20-teachers.js': {
      teacherPilot: {
        linkVerifiedUser: async () => { calls.referralLinks++; throw new Error('optional referral unavailable'); },
      },
    },
    '../lib/v20-deployment.js': {
      v20FeatureScope: (_req, _context, feature) =>
        referralEnabled && feature === 'REFERRAL' ? { mode: 'preview' } : null,
    },
  });
  const handler = (await loader.load('netlify/functions/session.js')).default;
  const request = () => new Request('https://otto-a1.netlify.app/api/session', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ telegramAuth: { id: tgId }, createIfMissing: true }),
  });
  return { handler, request, calls, verifiedAt };
}

test('new Telegram signup does not depend on disabled guest/referral lookup', async () => {
  const f = await telegramSignupGuardFixture({ failVerifiedAt: true, failGuestLink: true });
  const response = await f.handler(f.request(), { deploy: { context: 'production', id: 'synthetic-prod' } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).userId, USER);
  assert.match(response.headers.get('set-cookie') || '', /^otto_session=synthetic/u);
  assert.deepEqual(f.calls, { resolve: 1, verifiedAt: 0, guestLinks: [], referralLinks: 0 });
});

test('existing Telegram account never relinks a trial or referral', async () => {
  const f = await telegramSignupGuardFixture({ existingIdentity: true, signedGuest: true, referralEnabled: true });
  const response = await f.handler(f.request(), { deploy: { context: 'production', id: 'synthetic-prod' } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).created, false);
  assert.deepEqual(f.calls, { resolve: 0, verifiedAt: 0, guestLinks: [], referralLinks: 0 });
});

test('signed guest Telegram conversion links the original trial before issuing session', async () => {
  const f = await telegramSignupGuardFixture({ signedGuest: true });
  const response = await f.handler(f.request(), { deploy: { context: 'deploy-preview', id: 'synthetic-pr20' } });
  assert.equal(response.status, 200);
  assert.deepEqual(f.calls.guestLinks, [{ id: USER, when: f.verifiedAt }]);
  assert.equal(f.calls.verifiedAt, 1);
});

test('guest linkage failure blocks Telegram conversion instead of extending trial', async () => {
  const f = await telegramSignupGuardFixture({ signedGuest: true, failGuestLink: true });
  const response = await f.handler(f.request(), { deploy: { context: 'deploy-preview', id: 'synthetic-pr20' } });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, 'session_bootstrap_failed');
  assert.equal(response.headers.has('set-cookie'), false);
});

test('optional teacher referral failure never blocks Telegram signup', async () => {
  const f = await telegramSignupGuardFixture({ referralEnabled: true });
  const response = await f.handler(f.request(), { deploy: { context: 'deploy-preview', id: 'synthetic-pr20' } });
  assert.equal(response.status, 200);
  assert.equal(f.calls.referralLinks, 1);
  assert.equal(f.calls.verifiedAt, 1);
});
