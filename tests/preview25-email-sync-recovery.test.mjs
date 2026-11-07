import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceLoader } from './helpers/module-loader.mjs';

// All OTPs, database identities and stored account data below are synthetic.
// Real OTP verification code is loaded; only external Netlify Blobs and
// identity/database dependencies are replaced by isolated deterministic fakes.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const USER_ID = '11111111-1111-4111-8111-111111111111';
const EMAIL = 'existing@example.test';
const ORIGIN = 'https://deploy-preview-25--otto-a1.netlify.app';
const API_KEY = 'synthetic-unisender-key';

function request(challenge, code = challenge.code, email = EMAIL) {
  return new Request(ORIGIN + '/api/email-otp-verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, challengeId: challenge.challengeId, code }),
  });
}

function isolatedBackend({ dbFailures = 0 } = {}) {
  const records = new Map();
  const originalAccount = {
    userId: USER_ID,
    email: EMAIL,
    telegramUserId: '987654321',
    trialStartedAt: '2026-10-01T08:00:00Z',
    trialEndsAt: '2026-10-04T08:00:00Z',
    subscriptionUntil: '2027-01-01T00:00:00Z',
    progress: { horen: 12, lesen: 8, schreiben: 5, sprechen: 3 },
    schreibenDraft: 'Guten Tag!',
    sprechenResults: [80, 90],
    examResults: { exam01: 82, exam31: 86 },
    cards: ['Haus', 'Buch'],
    errors: ['lesen-1'],
    referralTeacher: 'synthetic-teacher',
    teacherCommissionMinor: 50000,
  };
  const accounts = new Map([[USER_ID, structuredClone(originalAccount)]]);
  const audit = { resolutions: [], sessionCookies: [], otpWrites: [], accountWrites: [] };
  const control = {
    dbFailures, failOtpRead: false, concurrencyBarrier: false, phantomCas: false,
  };
  let version = 0;
  let concurrentReads = 0;
  let releaseFirstRead = null;

  const store = {
    async get(key) {
      const entry = records.get(key);
      return entry ? structuredClone(entry.value) : null;
    },
    async getWithMetadata(key) {
      if (control.failOtpRead) {
        throw Object.assign(new Error('synthetic Netlify Blobs unavailable'), { code: 'BLOBS_UNAVAILABLE' });
      }
      const entry = records.get(key);
      if (!entry) return null;
      // Snapshot before the barrier: both HTTP requests race the SAME ETag.
      const snapshot = { data: structuredClone(entry.value), etag: entry.etag };
      if (control.concurrencyBarrier && key.startsWith('challenge:')) {
        concurrentReads += 1;
        if (concurrentReads === 1) {
          await new Promise(resolve => { releaseFirstRead = resolve; });
        } else if (concurrentReads === 2) {
          control.concurrencyBarrier = false;
          releaseFirstRead();
        }
      }
      return snapshot;
    },
    async setJSON(key, value, options = {}) {
      const current = records.get(key);
      if (options.onlyIfMatch && current?.etag !== options.onlyIfMatch) return { modified: false };
      if (options.onlyIfNew && current) return { modified: false };
      if (options.onlyIfMatch && control.phantomCas) return { modified: true, etag: '' };
      const next = { value: structuredClone(value), etag: 'etag-' + String(++version) };
      records.set(key, next);
      audit.otpWrites.push({ key, mode: options.onlyIfMatch ? 'CAS' : 'set' });
      return { modified: true, etag: next.etag };
    },
    async delete(key) { records.delete(key); },
  };
  const mocks = {
    '@netlify/blobs': {
      getStore: () => store,
      getDeployStore: () => store,
    },
    '../lib/telegram-access.js': { verifyTelegramInitData: () => null },
    '../lib/otto-supabase.js': {
      resolveVerifiedUser: async args => {
        // Check each property individually; args originates in the VM realm.
        audit.resolutions.push({ email: String(args.email), telegramUserId: args.telegramUserId });
        if (control.dbFailures > 0) {
          control.dbFailures -= 1;
          throw Object.assign(new Error('synthetic database connect timeout'), {
            code: 'UND_ERR_CONNECT_TIMEOUT',
          });
        }
        // An existing account is looked up, never replaced or duplicated.
        assert.equal(args.email, accounts.get(USER_ID).email);
        return USER_ID;
      },
      getOttoVerifiedTelegramId: async () => null,
      getOttoAccountVerifiedAt: async () => originalAccount.trialStartedAt,
      saveOttoLegalAcceptance: async () => null,
      touchOttoUserSession: async () => null,
      OTTO_LEGAL_VERSION: '2026-09-23-v1',
    },
    '../lib/otto-session.js': {
      createSessionCookie: id => {
        audit.sessionCookies.push(id);
        return 'otto_session=' + id + '; Path=/; HttpOnly; Secure';
      },
      readSession: () => null,
    },
    '../lib/preview20-guest-trial.js': {
      preview20Guest: { hasGuestCookie: () => false, linkNewRegistration: async () => true },
    },
    '../lib/preview20-teachers.js': { teacherPilot: { linkVerifiedUser: async () => null } },
    '../lib/v20-deployment.js': { v20FeatureScope: () => null },
  };
  const loader = sourceLoader(ROOT, {
    Netlify: {
      env: { get: name => name === 'UNISENDER_GO_API_KEY' ? API_KEY : '' },
      context: { deploy: { context: 'deploy-preview' } },
    },
    console: { ...console, error: () => {} },
  }, mocks);

  async function load() {
    return {
      otp: await loader.load('netlify/lib/email-otp.js'),
      verify: (await loader.load('netlify/functions/email-otp-verify.js')).default,
    };
  }
  async function issue(otp, oldChallengeId = null) {
    const challenge = await otp.createChallenge(EMAIL, API_KEY);
    await otp.activateChallenge(EMAIL, challenge.challengeId, oldChallengeId);
    return challenge;
  }
  return { load, issue, control, records, audit, accounts, originalAccount };
}

test('verified OTP + database connect timeout => 503, no session, expected email sync', async () => {
  const b = isolatedBackend({ dbFailures: 1 });
  const { otp, verify } = await b.load();
  const challenge = await b.issue(otp);
  const res = await verify(request(challenge), {});
  const body = await res.json();
  assert.equal(res.status, 503);
  assert.equal(body.code, 'account_sync_failed');
  assert.equal(body.recovery, 'request_new_otp');
  assert.equal(res.headers.has('set-cookie'), false);
  assert.equal(b.audit.sessionCookies.length, 0);
  assert.equal(b.audit.resolutions.length, 1);
  assert.equal(b.audit.resolutions[0].email, EMAIL);
  assert.equal(b.audit.resolutions[0].telegramUserId, null);
  assert.ok(b.records.get('challenge:' + challenge.challengeId)?.value.usedAt,
    'OTP must be consumed before resolving the user');
});

test('wrong OTP is 400; correct OTP succeeds once; reused OTP is 409', async () => {
  const b = isolatedBackend();
  const { otp, verify } = await b.load();
  const challenge = await b.issue(otp);
  const wrongCode = challenge.code === '000000' ? '111111' : '000000';
  const bad = await verify(request(challenge, wrongCode), {});
  assert.equal(bad.status, 400);
  assert.equal((await bad.json()).code, 'invalid_code');
  assert.equal(b.audit.resolutions.length, 0);
  assert.equal(b.audit.sessionCookies.length, 0);
  const ok = await verify(request(challenge), {});
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).userId, USER_ID);
  assert.match(ok.headers.get('set-cookie') || '', /^otto_session=/);
  const repeat = await verify(request(challenge), {});
  assert.equal(repeat.status, 409);
  assert.equal((await repeat.json()).code, 'used');
  assert.equal(repeat.headers.has('set-cookie'), false);
  assert.equal(b.audit.resolutions.length, 1);
  assert.deepEqual(b.audit.sessionCookies, [USER_ID]);
});

test('OTP store read failure => real handler returns 503 without cookie or identity sync', async () => {
  const b = isolatedBackend();
  const { otp, verify } = await b.load();
  const challenge = await b.issue(otp);
  b.control.failOtpRead = true;
  const failure = await verify(request(challenge), {});
  assert.equal(failure.status, 503);
  assert.equal((await failure.json()).code, 'otp_service_unavailable');
  assert.equal(failure.headers.has('set-cookie'), false);
  assert.equal(b.audit.sessionCookies.length, 0);
  assert.equal(b.audit.resolutions.length, 0);
  // This OTP was NOT consumed: it may work after the Blob store recovers.
  b.control.failOtpRead = false;
  const recovered = await verify(request(challenge), {});
  assert.equal(recovered.status, 200);
  assert.equal((await recovered.json()).userId, USER_ID);
  assert.equal(b.audit.sessionCookies.length, 1);
});

test('two simultaneous HTTP OTP verifications compete on one CAS: exactly one success', async () => {
  const b = isolatedBackend();
  const { otp, verify } = await b.load();
  const challenge = await b.issue(otp);
  b.control.concurrencyBarrier = true;
  const [first, second] = await Promise.all([
    verify(request(challenge), {}),
    verify(request(challenge), {}),
  ]);
  const statuses = [first.status, second.status].sort((a, c) => a - c);
  assert.deepEqual(statuses, [200, 409]);
  const bodies = await Promise.all([first.json(), second.json()]);
  assert.equal(bodies.filter(v => v.verified === true).length, 1);
  assert.equal(bodies.filter(v => v.code === 'used').length, 1);
  assert.equal(b.audit.resolutions.length, 1);
  assert.deepEqual(b.audit.sessionCookies, [USER_ID]);
  assert.ok(b.audit.otpWrites.some(w => w.mode === 'CAS'));
  assert.ok(b.records.get('challenge:' + challenge.challengeId)?.value.usedAt);
});

test('OTP used before DB failure cannot be replayed; new OTP restores SAME account', async () => {
  const b = isolatedBackend({ dbFailures: 1 });
  const { otp, verify } = await b.load();
  const before = structuredClone(b.accounts.get(USER_ID));
  const oldCode = await b.issue(otp);
  const first = await verify(request(oldCode), {});
  assert.equal(first.status, 503);
  assert.equal((await first.json()).code, 'account_sync_failed');
  assert.equal(first.headers.has('set-cookie'), false);
  const reuse = await verify(request(oldCode), {});
  assert.equal(reuse.status, 409);
  assert.equal((await reuse.json()).code, 'used');
  const newCode = await b.issue(otp, oldCode.challengeId);
  const recovered = await verify(request(newCode), {});
  assert.equal(recovered.status, 200);
  assert.equal((await recovered.json()).userId, USER_ID);
  assert.deepEqual(b.audit.sessionCookies, [USER_ID]);
  assert.equal(b.audit.resolutions.length, 2);
  assert.equal(b.audit.resolutions[0].email, EMAIL);
  assert.equal(b.audit.resolutions[1].email, EMAIL);
  assert.equal(b.accounts.size, 1, 'no second account may be created');
  assert.deepEqual(b.accounts.get(USER_ID), before,
    'existing UUID, Telegram, trial, subscription, progress, exam results and referrals remain untouched');
  assert.equal(b.audit.accountWrites.length, 0);
});

test('expired OTP never issues session or resolves identity', async () => {
  const b = isolatedBackend();
  const { otp, verify } = await b.load();
  const challenge = await b.issue(otp);
  const key = 'challenge:' + challenge.challengeId;
  b.records.get(key).value.expiresAt = Date.now() - 1;
  const expired = await verify(request(challenge), {});
  assert.equal(expired.status, 410);
  assert.equal((await expired.json()).code, 'expired');
  assert.equal(expired.headers.has('set-cookie'), false);
  assert.equal(b.audit.resolutions.length, 0);
  assert.equal(b.audit.sessionCookies.length, 0);
});


test('SDK phantom CAS result (modified=true, empty etag) fails closed before identity lookup', async () => {
  const b = isolatedBackend();
  const { otp, verify } = await b.load();
  const challenge = await b.issue(otp);
  b.control.phantomCas = true;
  const res = await verify(request(challenge), {});
  assert.equal(res.status, 503);
  assert.equal((await res.json()).code, 'otp_service_unavailable');
  assert.equal(res.headers.has('set-cookie'), false);
  assert.equal(b.audit.sessionCookies.length, 0);
  assert.equal(b.audit.resolutions.length, 0);
  assert.equal(b.records.get('challenge:' + challenge.challengeId)?.value.usedAt, null);
  b.control.phantomCas = false;
  const afterRestore = await verify(request(challenge), {});
  assert.equal(afterRestore.status, 200);
  assert.equal((await afterRestore.json()).userId, USER_ID);
  assert.deepEqual(b.audit.sessionCookies, [USER_ID]);
});

test('phantom CAS for incorrect-code attempts cannot reset or bypass attempt budget', async () => {
  const b = isolatedBackend();
  const { otp, verify } = await b.load();
  const challenge = await b.issue(otp);
  const wrong = challenge.code === '000000' ? '111111' : '000000';
  b.control.phantomCas = true;
  const res = await verify(request(challenge, wrong), {});
  assert.equal(res.status, 503);
  assert.equal((await res.json()).code, 'otp_service_unavailable');
  assert.equal(res.headers.has('set-cookie'), false);
  assert.equal(b.audit.sessionCookies.length, 0);
  assert.equal(b.audit.resolutions.length, 0);
  b.control.phantomCas = false;
  const bad = await verify(request(challenge, wrong), {});
  assert.equal(bad.status, 400);
  assert.equal((await bad.json()).code, 'invalid_code');
  assert.equal(b.records.get('challenge:' + challenge.challengeId)?.value.attemptsRemaining, 4);
});
