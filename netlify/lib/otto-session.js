import crypto from 'node:crypto';

const COOKIE_NAME = 'otto_session';
const TTL_SECONDS = 60 * 60 * 24 * 30;

function env(name) {
  return globalThis.Netlify?.env?.get?.(name) || process.env[name] || '';
}

function secret() {
  const value = env('OTTO_SESSION_SECRET');
  if (!value) throw new Error('otto_session_not_configured');
  return value;
}

function sign(value) {
  return crypto
    .createHmac('sha256', secret())
    .update(value)
    .digest('base64url');
}

export function createSessionToken(userId) {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    v: 1,
    sub: String(userId),
    iat: now,
    exp: now + TTL_SECONDS,
  })).toString('base64url');

  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token) {
  if (typeof token !== 'string' || !token) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;
  const expected = sign(payload);

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);

    if (
      data?.v !== 1 ||
      typeof data?.sub !== 'string' ||
      !data.sub ||
      !Number.isInteger(data?.exp) ||
      data.exp <= now
    ) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export function createSessionCookie(userId) {
  return [
    `${COOKIE_NAME}=${createSessionToken(userId)}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${TTL_SECONDS}`,
  ].join('; ');
}

export function readSession(req) {
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = cookieHeader.split(';');

  for (const item of cookies) {
    const [rawName, ...rawValue] = item.trim().split('=');
    if (rawName === COOKIE_NAME) {
      return verifySessionToken(rawValue.join('='));
    }
  }

  return null;
}

export function clearSessionCookie() {
  return [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Max-Age=0',
  ].join('; ');
}
