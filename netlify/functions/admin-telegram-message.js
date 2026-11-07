import { getDeployStore, getStore } from '@netlify/blobs';
import { json } from '../lib/email-otp.js';
import { readAdminSession } from '../lib/admin-auth.js';
import { getOttoVerifiedTelegramId } from '../lib/otto-supabase.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_CHARS = 2000;
const MIN_INTERVAL_MS = 60_000;
const STORE_NAME = 'otto-admin-telegram-messages-v1';

function environment(name) {
  return globalThis.Netlify?.env?.get?.(name) || process.env[name] || '';
}

function store() {
  const options = { consistency: 'strong' };
  return environment('CONTEXT') === 'production'
    ? getStore(STORE_NAME, options)
    : getDeployStore(STORE_NAME, options);
}

function userKey(userId) { return `user/${userId}`; }
function validUserId(value) { return typeof value === 'string' && UUID_RE.test(value.trim()); }

function sourceAllowed(req) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(req.url).origin; } catch { return false; }
}

function publicStatus(record) {
  if (!record) return { lastSentAt: null, lastStatus: null, lastError: null };
  return {
    lastSentAt: record.lastSentAt || null,
    lastStatus: record.lastStatus || null,
    lastError: record.lastError || null,
  };
}

export default async (req) => {
  const admin = readAdminSession(req);
  if (!admin) return json({ code: 'not_authenticated' }, 401);
  if (!['GET', 'POST'].includes(req.method)) {
    return json({ code: 'method_not_allowed' }, 405, { Allow: 'GET, POST' });
  }
  if (!sourceAllowed(req)) return json({ code: 'invalid_origin' }, 403);

  let userId;
  let message;
  if (req.method === 'GET') {
    userId = new URL(req.url).searchParams.get('userId');
  } else {
    const raw = await req.text();
    if (raw.length > 12000) return json({ code: 'request_too_large' }, 413);
    let body;
    try { body = JSON.parse(raw || '{}'); }
    catch { return json({ code: 'invalid_json' }, 400); }
    userId = body.userId;
    message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message || message.length > MAX_CHARS) {
      return json({ code: 'invalid_message' }, 400);
    }
  }
  if (!validUserId(userId)) return json({ code: 'invalid_user_id' }, 400);
  userId = userId.trim();

  try {
    const verifiedTelegramId = await getOttoVerifiedTelegramId(userId);
    if (!verifiedTelegramId || !/^\d{4,20}$/.test(verifiedTelegramId)) {
      return json({ code: 'telegram_not_linked' }, 409);
    }
    const key = userKey(userId);
    const history = await store().get(key, { type: 'json' });
    if (req.method === 'GET') return json({ ok: true, ...publicStatus(history) });
    if (history?.lastSentAt && Date.now() - Date.parse(history.lastSentAt) < MIN_INTERVAL_MS) {
      return json({ code: 'send_cooldown', ...publicStatus(history) }, 429);
    }
    const token = environment('TELEGRAM_BOT_TOKEN');
    if (!token) return json({ code: 'telegram_not_configured' }, 503);

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: verifiedTelegramId, text: message, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(15_000),
    });
    const result = await response.json().catch(() => ({}));
    const accepted = response.ok && result?.ok === true;
    const now = new Date().toISOString();
    const error = accepted ? null : (result?.error_code === 403 ? 'bot_blocked_or_not_started'
      : result?.error_code === 400 ? 'telegram_chat_unavailable' : 'telegram_send_failed');
    const updated = {
      lastSentAt: accepted ? now : history?.lastSentAt || null,
      lastStatus: accepted ? 'telegram_accepted' : 'failed',
      lastError: error,
      lastAttemptAt: now,
      lastAdmin: admin.login,
      telegramMessageId: accepted ? result?.result?.message_id || null : null,
    };
    await store().setJSON(key, updated);
    return json({ ok: accepted, ...publicStatus(updated) }, accepted ? 200 : 502);
  } catch (error) {
    console.error('OTTO admin Telegram message unavailable:', error?.name || 'error');
    return json({ code: 'telegram_message_unavailable' }, 503);
  }
};

export const config = { path: '/api/admin-telegram-message' };
