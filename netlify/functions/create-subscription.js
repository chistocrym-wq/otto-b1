import { env, getPriceStars, json, verifyTelegramInitData } from '../lib/telegram-access.js';

const SUBSCRIPTION_SECONDS = 2_592_000;

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });

  const botToken = env('TELEGRAM_BOT_TOKEN');
  const priceStars = getPriceStars();
  if (!botToken || !priceStars) {
    return json({
      error: 'Оплата пока не настроена. Нужны TELEGRAM_BOT_TOKEN и TELEGRAM_STARS_PRICE.',
      code: 'payments_not_configured',
    }, 503);
  }

  const body = await req.json().catch(() => ({}));
  const user = verifyTelegramInitData(body.initData);
  if (!user) {
    return json({ error: 'Откройте тренажёр внутри Telegram, чтобы оформить подписку.', code: 'telegram_auth_required' }, 401);
  }

  const payloadId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const invoicePayload = `otto-premium:${user.id}:${payloadId}`;
  const response = await fetch(`https://api.telegram.org/bot${botToken}/createInvoiceLink`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: 'Otto Premium',
      description: 'Полный доступ к тренажёру Goethe A1 на 30 дней',
      payload: invoicePayload,
      currency: 'XTR',
      prices: [{ label: 'Otto Premium · 30 дней', amount: priceStars }],
      subscription_period: SUBSCRIPTION_SECONDS,
    }),
  });

  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok || typeof result.result !== 'string') {
    return json({
      error: result?.description || 'Telegram не создал ссылку оплаты. Попробуйте ещё раз.',
      code: 'invoice_error',
    }, 502);
  }

  return json({ invoiceLink: result.result, priceStars });
};

export const config = { path: '/api/create-subscription' };
