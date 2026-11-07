import { env, getPriceStars, json, revokePremium, savePremium } from '../lib/telegram-access.js';

function parsePremiumPayload(payload) {
  const match = /^otto-premium:(\d+):([a-z0-9-]+)$/i.exec(String(payload || ''));
  if (!match) return null;
  return { userId: Number(match[1]), nonce: match[2] };
}

async function telegramApi(method, body) {
  const botToken = env('TELEGRAM_BOT_TOKEN');
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json().catch(() => null);
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });

  const botToken = env('TELEGRAM_BOT_TOKEN');
  if (!botToken) return json({ error: 'Bot is not configured' }, 503);

  const webhookSecret = env('TELEGRAM_WEBHOOK_SECRET');
  if (webhookSecret) {
    const incomingSecret = req.headers.get('x-telegram-bot-api-secret-token') || '';
    if (incomingSecret !== webhookSecret) return json({ error: 'Unauthorized' }, 401);
  }

  const update = await req.json().catch(() => ({}));
  const priceStars = getPriceStars();

  if (update.pre_checkout_query) {
    const query = update.pre_checkout_query;
    const parsed = parsePremiumPayload(query.invoice_payload);
    const valid = Boolean(
      parsed &&
      parsed.userId === Number(query.from?.id) &&
      query.currency === 'XTR' &&
      (!priceStars || Number(query.total_amount) === priceStars)
    );

    await telegramApi('answerPreCheckoutQuery', valid
      ? { pre_checkout_query_id: query.id, ok: true }
      : {
          pre_checkout_query_id: query.id,
          ok: false,
          error_message: 'Не удалось подтвердить подписку Otto. Откройте тренажёр и попробуйте оплату ещё раз.',
        });
    return json({ ok: true });
  }

  const message = update.message || update.edited_message;
  const payment = message?.successful_payment;
  if (payment) {
    const parsed = parsePremiumPayload(payment.invoice_payload);
    if (
      parsed &&
      parsed.userId === Number(message.from?.id) &&
      payment.currency === 'XTR' &&
      (!priceStars || Number(payment.total_amount) === priceStars)
    ) {
      const premiumUntil = payment.subscription_expiration_date
        ? Number(payment.subscription_expiration_date) * 1000
        : undefined;
      await savePremium(parsed.userId, {
        premiumUntil,
        paymentChargeId: payment.telegram_payment_charge_id,
        amount: payment.total_amount,
      });
    }
    return json({ ok: true });
  }

  const refund = message?.refunded_payment;
  if (refund) {
    const parsed = parsePremiumPayload(refund.invoice_payload);
    if (parsed && parsed.userId === Number(message.from?.id)) {
      await revokePremium(parsed.userId, refund.telegram_payment_charge_id);
    }
    return json({ ok: true });
  }

  return json({ ok: true });
};

export const config = { path: '/api/telegram-webhook' };
