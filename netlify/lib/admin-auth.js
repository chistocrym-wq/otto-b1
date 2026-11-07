import crypto from 'node:crypto';

const COOKIE_NAME = 'otto_admin_session';
const TTL_SECONDS = 60 * 60 * 12;

function env(name) {
  return globalThis.Netlify?.env?.get?.(name) || process.env[name] || '';
}

function secret() {
  const value = env('OTTO_ADMIN_SESSION_SECRET');
  if (!value) throw new Error('otto_admin_session_not_configured');
  return value;
}

function hash(value) {
  return crypto.createHash('sha256').update(String(value)).digest();
}

function safeEqual(a, b) {
  const left = hash(a);
  const right = hash(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}

export function verifyAdminCredentials(login, password) {
  const expectedLogin = env('OTTO_ADMIN_LOGIN');
  const expectedPassword = env('OTTO_ADMIN_PASSWORD');
  if (!expectedLogin || !expectedPassword) throw new Error('otto_admin_credentials_not_configured');
  const normalizedLogin = String(login || '').trim();
  return safeEqual(normalizedLogin, expectedLogin) && safeEqual(String(password || ''), expectedPassword)
    ? expectedLogin
    : null;
}

export function createAdminSessionToken(login) {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    v: 1,
    login: String(login),
    iat: now,
    exp: now + TTL_SECONDS,
  })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminSessionToken(token) {
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
    if (data?.v !== 1 || typeof data?.login !== 'string' || !data.login || !Number.isInteger(data?.exp) || data.exp <= now) return null;
    return data;
  } catch {
    return null;
  }
}

export function createAdminSessionCookie(login) {
  return [
    `${COOKIE_NAME}=${createAdminSessionToken(login)}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    `Max-Age=${TTL_SECONDS}`,
  ].join('; ');
}

export function clearAdminSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function readAdminSession(req) {
  const cookieHeader = req.headers.get('cookie') || '';
  for (const item of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = item.trim().split('=');
    if (rawName === COOKIE_NAME) return verifyAdminSessionToken(rawValue.join('='));
  }
  return null;
}

/** Require a still-current, signed, unexpired administrator cookie. */
export function readCurrentAdminSession(req) {
  const currentLogin=env('OTTO_ADMIN_LOGIN');
  if(!currentLogin||!env('OTTO_ADMIN_SESSION_SECRET'))
    throw new Error('otto_admin_session_not_configured');
  const session=readAdminSession(req);
  return session?.login===currentLogin?session:null;
}
