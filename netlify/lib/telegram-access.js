import { createHmac, timingSafeEqual, createHash } from 'node:crypto';
import { getDeployStore, getStore } from '@netlify/blobs';

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_SECONDS = 2_592_000;
const DEFAULT_FREE_AI_LIMIT = 3;

export function env(name) {
  return Netlify.env.get(name) || '';
}

export function getPriceStars() {
  const value = Number.parseInt(env('TELEGRAM_STARS_PRICE'), 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function getFreeAiLimit() {
  const value = Number.parseInt(env('FREE_AI_DAILY_LIMIT'), 10);
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_FREE_AI_LIMIT;
}

function store() {
  const options = { consistency: 'strong' };
  if (Netlify.context?.deploy?.context === 'production') {
    return getStore('otto-access', options);
  }
  return getDeployStore('otto-access', options);
}

function safeEqualHex(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

export function verifyTelegramInitData(initData) {
  const botToken = env('TELEGRAM_BOT_TOKEN');
  if (!botToken || !initData || typeof initData !== 'string') return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;

  const authDate = Number(params.get('auth_date') || 0);
  if (!Number.isFinite(authDate) || authDate <= 0) return null;
  const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
  if (ageSeconds < -300 || ageSeconds > 86_400) return null;

  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== 'hash')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  if (!safeEqualHex(hash, calculatedHash)) return null;

  try {
    const user = JSON.parse(params.get('user') || 'null');
    if (!user?.id) return null;
    return user;
  } catch {
    return null;
  }
}


export function verifyTelegramLoginData(input) {
  const botToken = env('TELEGRAM_BOT_TOKEN');
  if (!botToken || !input || typeof input !== 'object') return null;

  const hash = typeof input.hash === 'string' ? input.hash : '';
  const authDate = Number(input.auth_date || 0);
  const id = Number(input.id || 0);
  if (!hash || !Number.isSafeInteger(id) || id <= 0 || !Number.isFinite(authDate) || authDate <= 0) return null;

  const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
  if (ageSeconds < -300 || ageSeconds > 86_400) return null;

  const allowedKeys = [
    'auth_date',
    'first_name',
    'id',
    'last_name',
    'photo_url',
    'username',
  ];

  const dataCheckString = allowedKeys
    .filter((key) => input[key] !== undefined && input[key] !== null && String(input[key]) !== '')
    .sort()
    .map((key) => `${key}=${String(input[key])}`)
    .join('\n');

  const secretKey = createHash('sha256').update(botToken).digest();
  const calculatedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  if (!safeEqualHex(hash, calculatedHash)) return null;

  return {
    id,
    first_name: typeof input.first_name === 'string' ? input.first_name : '',
    last_name: typeof input.last_name === 'string' ? input.last_name : '',
    username: typeof input.username === 'string' ? input.username : '',
    photo_url: typeof input.photo_url === 'string' ? input.photo_url : '',
    auth_date: authDate,
  };
}

function userKey(userId) {
  return `user:${String(userId)}`;
}

function guestKey(clientId) {
  const digest = createHash('sha256').update(String(clientId || '')).digest('hex').slice(0, 32);
  return digest ? `guest:${digest}` : null;
}

export async function getAccessRecord(userId) {
  if (!userId) return null;
  return (await store().get(userKey(userId), { type: 'json' })) || null;
}

export function premiumUntilMs(record) {
  const value = Number(record?.premiumUntil || 0);
  return Number.isFinite(value) ? value : 0;
}

export function isPremiumRecord(record) {
  return premiumUntilMs(record) > Date.now();
}

export async function savePremium(userId, payment) {
  const current = (await getAccessRecord(userId)) || {};
  const currentUntil = premiumUntilMs(current);
  const now = Date.now();
  const suppliedUntil = Number(payment?.premiumUntil || 0);
  const premiumUntil = suppliedUntil > now
    ? suppliedUntil
    : Math.max(currentUntil, now) + MONTH_SECONDS * 1000;

  const next = {
    ...current,
    telegramUserId: Number(userId),
    plan: 'premium',
    premiumUntil,
    paymentChargeId: payment?.paymentChargeId || current.paymentChargeId || null,
    lastPaymentAmount: payment?.amount ?? current.lastPaymentAmount ?? null,
    updatedAt: new Date().toISOString(),
  };
  await store().setJSON(userKey(userId), next);
  return next;
}

export async function revokePremium(userId, paymentChargeId) {
  const current = (await getAccessRecord(userId)) || {};
  const next = {
    ...current,
    telegramUserId: Number(userId),
    plan: 'free',
    premiumUntil: 0,
    refundedChargeId: paymentChargeId || null,
    updatedAt: new Date().toISOString(),
  };
  await store().setJSON(userKey(userId), next);
  return next;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function getAiUsageStatus({ initData, clientId }) {
  const user = verifyTelegramInitData(initData);
  const record = user ? await getAccessRecord(user.id) : null;
  const premium = isPremiumRecord(record);
  const freeLimit = getFreeAiLimit();

  if (premium) {
    return {
      authenticated: true,
      telegramUserId: user.id,
      premium: true,
      limit: null,
      used: 0,
      remaining: null,
    };
  }

  const key = user ? userKey(user.id) : guestKey(clientId);
  if (!key) {
    return { authenticated: false, premium: false, limit: freeLimit, used: 0, remaining: freeLimit };
  }

  const data = (await store().get(key, { type: 'json' })) || {};
  const day = todayKey();
  const usage = data.aiUsage?.day === day ? Number(data.aiUsage?.count || 0) : 0;
  return {
    authenticated: Boolean(user),
    telegramUserId: user?.id || null,
    premium: false,
    limit: freeLimit,
    used: usage,
    remaining: Math.max(0, freeLimit - usage),
  };
}

export async function consumeAiQuota({ initData, clientId }) {
  const user = verifyTelegramInitData(initData);
  const userRecord = user ? await getAccessRecord(user.id) : null;
  if (isPremiumRecord(userRecord)) {
    return { allowed: true, premium: true, remaining: null };
  }

  const limit = getFreeAiLimit();
  if (limit <= 0) return { allowed: false, premium: false, remaining: 0 };

  const key = user ? userKey(user.id) : guestKey(clientId);
  if (!key) return { allowed: false, premium: false, remaining: 0 };

  const current = (await store().get(key, { type: 'json' })) || {};
  const day = todayKey();
  const used = current.aiUsage?.day === day ? Number(current.aiUsage?.count || 0) : 0;
  if (used >= limit) return { allowed: false, premium: false, remaining: 0 };

  const nextUsed = used + 1;
  await store().setJSON(key, {
    ...current,
    ...(user ? { telegramUserId: user.id } : {}),
    aiUsage: { day, count: nextUsed },
    updatedAt: new Date().toISOString(),
  });
  return { allowed: true, premium: false, remaining: Math.max(0, limit - nextUsed) };
}

export async function reconcileRecentStarsPayment(userId) {
  const botToken = env('TELEGRAM_BOT_TOKEN');
  if (!botToken || !userId) return null;

  let offset = 0;
  const cutoff = Math.floor(Date.now() / 1000) - 35 * 24 * 60 * 60;

  for (let page = 0; page < 5; page += 1) {
    const url = new URL(`https://api.telegram.org/bot${botToken}/getStarTransactions`);
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('limit', '100');
    const response = await fetch(url);
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) return null;

    const transactions = payload.result?.transactions || [];
    if (!transactions.length) return null;

    for (const tx of transactions) {
      const source = tx?.source;
      const payloadText = source?.invoice_payload || '';
      if (
        tx?.amount > 0 &&
        source?.type === 'user' &&
        source?.transaction_type === 'invoice_payment' &&
        Number(source?.user?.id) === Number(userId) &&
        payloadText.startsWith(`otto-premium:${userId}:`)
      ) {
        const period = Number(source?.subscription_period || MONTH_SECONDS);
        const premiumUntil = (Number(tx.date) + period) * 1000;
        if (premiumUntil > Date.now()) {
          return savePremium(userId, {
            premiumUntil,
            paymentChargeId: tx.id,
            amount: tx.amount,
          });
        }
      }
    }

    const oldest = Math.min(...transactions.map((tx) => Number(tx?.date || Number.MAX_SAFE_INTEGER)));
    if (oldest < cutoff || transactions.length < 100) return null;
    offset += transactions.length;
  }
  return null;
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}
