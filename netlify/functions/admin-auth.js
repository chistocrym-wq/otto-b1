import { getDeployStore, getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';
import { json } from '../lib/email-otp.js';
import {
  clearAdminSessionCookie,
  createAdminSessionCookie,
  readAdminSession,
  verifyAdminCredentials,
} from '../lib/admin-auth.js';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

function rateStore() {
  const options = { consistency: 'strong' };
  if (globalThis.Netlify?.context?.deploy?.context === 'production') return getStore('otto-admin-auth-rate', options);
  return getDeployStore('otto-admin-auth-rate', options);
}

function clientIp(req) {
  return req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function rateKey(req) {
  return `ip:${createHash('sha256').update(clientIp(req)).digest('hex').slice(0, 32)}`;
}

async function readRate(req) {
  const now = Date.now();
  const key = rateKey(req);
  const current = (await rateStore().get(key, { type: 'json' })) || {};
  const startedAt = Number(current.startedAt || 0);
  if (!startedAt || now - startedAt >= WINDOW_MS) return { key, startedAt: now, failures: 0 };
  return { key, startedAt, failures: Number(current.failures || 0) };
}

export default async (req) => {
  if (req.method === 'GET') {
    const session = readAdminSession(req);
    return session
      ? json({ authenticated: true, login: session.login })
      : json({ authenticated: false }, 401);
  }

  if (req.method === 'DELETE') {
    return json({ ok: true }, 200, { 'Set-Cookie': clearAdminSessionCookie() });
  }

  if (req.method === 'POST') {
    const rate = await readRate(req);
    if (rate.failures >= MAX_FAILURES) {
      const retryAfter = Math.max(1, Math.ceil((rate.startedAt + WINDOW_MS - Date.now()) / 1000));
      return json({ code: 'admin_login_rate_limited', retryAfter }, 429, { 'Retry-After': String(retryAfter) });
    }
    const body = await req.json().catch(() => ({}));
    try {
      const login = verifyAdminCredentials(body.login, body.password);
      if (!login) {
        await rateStore().setJSON(rate.key, { startedAt: rate.startedAt, failures: rate.failures + 1 });
        return json({ code: 'invalid_admin_credentials' }, 401);
      }
      await rateStore().delete(rate.key).catch(() => undefined);
      return json({ authenticated: true, login }, 200, { 'Set-Cookie': createAdminSessionCookie(login) });
    } catch (error) {
      console.error('Admin auth configuration error:', error);
      return json({ code: 'admin_auth_not_configured' }, 503);
    }
  }

  return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST, DELETE' });
};

export const config = { path: '/api/admin-auth' };
