import {
  env,
  getAccessRecord,
  getAiUsageStatus,
  getFreeAiLimit,
  getPriceStars,
  isPremiumRecord,
  json,
  premiumUntilMs,
  reconcileRecentStarsPayment,
  verifyTelegramInitData,
} from '../lib/telegram-access.js';

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });

  const body = await req.json().catch(() => ({}));
  const initData = typeof body.initData === 'string' ? body.initData : '';
  const clientId = typeof body.clientId === 'string' ? body.clientId : '';
  const botConfigured = Boolean(env('TELEGRAM_BOT_TOKEN'));
  const priceStars = getPriceStars();
  const paymentsConfigured = botConfigured && priceStars > 0;
  const user = verifyTelegramInitData(initData);

  if (!user) {
    const ai = await getAiUsageStatus({ initData: '', clientId });
    return json({
      authenticated: false,
      telegramUserId: null,
      plan: 'free',
      premium: false,
      premiumUntil: null,
      paymentsConfigured,
      priceStars: priceStars || null,
      freeContentPercent: 50,
      freeAiDailyLimit: getFreeAiLimit(),
      aiUsedToday: ai.used,
      aiRemainingToday: ai.remaining,
      reason: botConfigured ? 'open_in_telegram' : 'bot_not_configured',
    });
  }

  let record = await getAccessRecord(user.id);
  if (!isPremiumRecord(record) && paymentsConfigured) {
    try {
      const reconciled = await reconcileRecentStarsPayment(user.id);
      if (reconciled) record = reconciled;
    } catch {
      // Status still works even if Telegram transaction reconciliation is temporarily unavailable.
    }
  }

  const premium = isPremiumRecord(record);
  const ai = await getAiUsageStatus({ initData, clientId });
  return json({
    authenticated: true,
    telegramUserId: user.id,
    firstName: user.first_name || '',
    plan: premium ? 'premium' : 'free',
    premium,
    premiumUntil: premium ? new Date(premiumUntilMs(record)).toISOString() : null,
    paymentsConfigured,
    priceStars: priceStars || null,
    freeContentPercent: 50,
    freeAiDailyLimit: getFreeAiLimit(),
    aiUsedToday: ai.used,
    aiRemainingToday: ai.remaining,
  });
};

export const config = { path: '/api/access-status' };
