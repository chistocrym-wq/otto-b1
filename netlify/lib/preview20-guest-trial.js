import { createHmac, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { readSession } from './otto-session.js';
import {v20FeatureScope,v20SameOrigin,v20StoreName} from './v20-deployment.js';

// Production guest requests remain denied unless independently authorized by server feature flags.
// Guest identities never enter otto_users, subscription, or progress tables.
export const PREVIEW20_HOST = 'deploy-preview-20--otto-a1.netlify.app';
export const GUEST_STORE = 'otto-preview20-guest-trial-v1';
export const GUEST_TRIAL_MS = 72 * 60 * 60 * 1000;
const COOKIE = 'otto_preview20_guest';
const COOKIE_AGE = 30 * 24 * 60 * 60;
const AI_LIMIT = 60;
// Each successful guest AI authorization can be claimed by one operation ID.
// The small ledger is bounded by the 60-credit lifetime limit.
const OPERATION_HEADER = 'x-otto-ai-operation-id';
const OPERATION_PATTERN = /^[A-Za-z0-9_-]{16,96}$/;
const idPattern = /^[0-9a-f]{8}-[0-9a-f-]{27,40}$/i;
const hash = input => createHash('sha256').update(input).digest('hex');
const guestKey = id => 'guest/' + id;
const userKey = id => 'registered/' + hash(id);

export function isPreview20Request(req,context){return Boolean(v20FeatureScope(req,context,'GUEST'));}
function sameOrigin(req){const u=new URL(req.url);return v20SameOrigin(req,{origin:u.origin});}
function envSecret() {
  return globalThis.Netlify?.env?.get?.('OTTO_SESSION_SECRET') || process.env.OTTO_SESSION_SECRET || '';
}
function sign(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}
function verifiedToken(req, secret) {
  if (!secret) return null;
  const source = (req.headers.get('cookie') || '').split(';').map(v => v.trim());
  const raw = source.find(v => v.startsWith(COOKIE + '='));
  if (!raw) return null;
  const token = raw.slice(COOKIE.length + 1);
  const parts = token.split('.');
  if (parts.length !== 2 || parts[0].length > 300 || parts[1].length > 100) return null;
  const expected = Buffer.from(sign(parts[0], secret));
  const supplied = Buffer.from(parts[1]);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const data = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (data?.v !== 1 || !idPattern.test(data.gid) || !Number.isSafeInteger(data.exp) ||
      data.exp <= Math.floor(Date.now() / 1000)) return null;
    return data.gid;
  } catch { return null; }
}

function cookieFor(id, secret) {
  const payload = Buffer.from(JSON.stringify({
    v: 1, gid: id, exp: Math.floor(Date.now() / 1000) + COOKIE_AGE
  })).toString('base64url');
  return COOKIE + '=' + payload + '.' + sign(payload, secret) +
    '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + COOKIE_AGE;
}

// The injected dependencies permit deterministic synthetic tests without Netlify writes.
export function createPreview20GuestService({
  openStore = (scope) => getStore(v20StoreName('GUEST',scope)||GUEST_STORE),
  secretProvider = envSecret,
  now = () => Date.now()
} = {}) {
  // Cheap, signed-cookie preflight for optional registration linking.
  // Do not query guest Blobs or account timestamps for ordinary Email logins.
  function hasGuestCookie(req, context) {
    return isPreview20Request(req, context) &&
      Boolean(verifiedToken(req, secretProvider()));
  }

  async function read(req, context) {
    if (!isPreview20Request(req, context)) return null;
    const id = verifiedToken(req, secretProvider());
    if (!id) return null;
    const record = await openStore(v20FeatureScope(req,context,'GUEST')).get(guestKey(id), { type: 'json', consistency: 'strong' });
    if (!record || record.id !== id || !Number.isSafeInteger(record.startedAt)) return null;
    return { id, startedAt: record.startedAt, endsAt: record.startedAt + GUEST_TRIAL_MS,
      active: now() < record.startedAt + GUEST_TRIAL_MS };
  }

  async function start(req, context) {
    if (!isPreview20Request(req, context)) return { status: 404, code: 'preview_only' };
    if (!sameOrigin(req)) return { status: 403, code: 'invalid_origin' };
    if (readSession(req)) return { status: 409, code: 'already_registered' };
    const existing = await read(req, context);
    if (existing) return { status: 200, ...existing };
    const secret = secretProvider();
    if (!secret) return { status: 503, code: 'session_unavailable' };
    const id = randomUUID(), startedAt = now();
    const record = { id, startedAt, aiUses: 0 };
    const saved = await openStore(v20FeatureScope(req,context,'GUEST')).setJSON(guestKey(id), record, { onlyIfNew: true });
    if (!saved?.modified) return { status: 503, code: 'guest_creation_failed' };
    return { status: 200, id, startedAt, endsAt: startedAt + GUEST_TRIAL_MS,
      active: true, cookie: cookieFor(id, secret) };
  }

  async function linkNewRegistration(req, context, userId, verifiedAt) {
    if (!isPreview20Request(req, context) || typeof userId !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(userId)) return false;
    const guest = await read(req, context);
    if (!guest) return false;
    const verifiedMs = Date.parse(verifiedAt || '');
    // Old accounts (created before this guest trial) retain all existing access dates.
    if (!Number.isFinite(verifiedMs) || verifiedMs < guest.startedAt ||
      verifiedMs > now() + 60_000) return false;
    const store = openStore(v20FeatureScope(req,context,'GUEST'));
    const saved = await store.setJSON(userKey(userId), {
      userIdHash: hash(userId), startedAt: guest.startedAt, guestIdHash: hash(guest.id)
    }, { onlyIfNew: true });
    if (saved?.modified) return true;
    const linked = await store.get(userKey(userId), { type: 'json', consistency: 'strong' });
    return linked?.startedAt === guest.startedAt;
  }

  async function registeredTrialStart(req, context, userId, verifiedAt) {
    if (!isPreview20Request(req, context)) return verifiedAt;
    const record = await openStore(v20FeatureScope(req,context,'GUEST')).get(userKey(userId), { type: 'json', consistency: 'strong' });
    const original = Date.parse(verifiedAt || '');
    if (record?.userIdHash !== hash(userId) || !Number.isSafeInteger(record.startedAt) ||
      !Number.isFinite(original) || record.startedAt > original) return verifiedAt;
    return new Date(record.startedAt).toISOString();
  }

  async function consumeAiCredit(req, context) {
    const scope = v20FeatureScope(req, context, 'GUEST');
    if (!scope) return { allowed: false, code: 'guest_access_unavailable', status: 403 };
    const guest = await read(req, context);
    if (!guest?.active) return { allowed: false, code: 'guest_trial_expired', status: 403 };

    // The client assigns one unpredictable ID to each AI operation and MUST
    // reuse it for HTTP retries. Preview-only legacy tabs without the header
    // keep their previous behavior; Production guest traffic fails closed.
    const supplied = req.headers.get(OPERATION_HEADER);
    if (supplied !== null && !OPERATION_PATTERN.test(supplied))
      return { allowed: false, code: 'guest_ai_operation_invalid', status: 400 };
    if (scope.mode === 'production' && supplied === null)
      return { allowed: false, code: 'guest_ai_operation_required', status: 400 };
    const operationHash = supplied ? hash(guest.id + ':' + supplied) : null;

    // Debit the same environment-scoped record as start() and read().
    // The CAS update atomically commits the debit and replay fingerprint.
    // A replay is denied BEFORE the paid provider is called; no result cache
    // is asserted, and a new operation ID represents a new paid operation.
    const store = openStore(scope);
    for (let attempt = 0; attempt < 5; attempt++) {
      const entry = await store.getWithMetadata(guestKey(guest.id),
        { type: 'json', consistency: 'strong' });
      if (!entry?.data || entry.data.startedAt !== guest.startedAt ||
        now() >= guest.endsAt) return { allowed: false, code: 'guest_trial_expired', status: 403 };
      const previous = Array.isArray(entry.data.aiOperationHashes)
        ? entry.data.aiOperationHashes : [];
      if (operationHash && previous.includes(operationHash))
        return { allowed: false, code: 'guest_ai_operation_repeated', status: 409 };
      const count = Number(entry.data.aiUses) || 0;
      if (count >= AI_LIMIT) return { allowed: false, code: 'guest_ai_limit', status: 429 };
      const saved = await store.setJSON(guestKey(guest.id),
        { ...entry.data, aiUses: count + 1,
          ...(operationHash ? { aiOperationHashes: [...previous, operationHash] } : {}) },
        { onlyIfMatch: entry.etag });
      if (saved?.modified) return { allowed: true };
    }
    return { allowed: false, code: 'guest_ai_busy', status: 429 };
  }

  return { hasGuestCookie, read, start, linkNewRegistration, registeredTrialStart, consumeAiCredit };
}

export const preview20Guest = createPreview20GuestService();
