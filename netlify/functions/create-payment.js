import { json } from '../lib/email-otp.js';
import { readSession } from '../lib/otto-session.js';
import { getPaymentEnvironment } from '../lib/payment-environment.js';
import { createPayment } from '../lib/payment-provider.js';
import { PAYMENT_RECEIPT_PAYMENT_MODE } from '../lib/payment-receipt.js';
import { getOttoVerifiedEmail } from '../lib/otto-supabase.js';

const AMOUNT_RUB = 1500;
const AMOUNT_MINOR = 150000;
const PERIOD_DAYS = 30;

function getReturnUrl(req) {
  const deployUrl =
    Netlify.env.get('DEPLOY_PRIME_URL') ||
    Netlify.env.get('URL') ||
    new URL(req.url).origin;

  return `${String(deployUrl).replace(/\/$/, '')}/?payment=return`;
}

export async function handleCreatePayment(
  req,
  context,
  {
    readSessionFn = readSession,
    getVerifiedEmailFn = getOttoVerifiedEmail,
    createPaymentFn = createPayment,
    paymentMode = PAYMENT_RECEIPT_PAYMENT_MODE,
  } = {},
) {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
  }

  const session = readSessionFn(req);
  if (!session) {
    return json({
      error: 'Войдите в OTTO, чтобы продолжить.',
      code: 'not_authenticated',
    }, 401);
  }

  const environment = getPaymentEnvironment(context);
  if (!environment) {
    return json({
      error: 'Онлайн-оплата недоступна в этом окружении.',
      code: 'payments_disabled',
    }, 503);
  }

  try {
    const verifiedEmail = await getVerifiedEmailFn(session.sub);
    if (!verifiedEmail) {
      return json({
        error: 'Для оплаты подтвердите email в аккаунте OTTO.',
        code: 'payment_email_required',
      }, 422);
    }

    const payment = await createPaymentFn({
      userId: session.sub,
      amountMinor: AMOUNT_MINOR,
      currency: 'RUB',
      environment,
      verifiedEmail,
      paymentMode,
      periodDays: PERIOD_DAYS,
      description: 'OTTO A1 — полный доступ на 30 дней',
      returnUrl: getReturnUrl(req),
    });

    return json({
      status: payment.status,
      provider: payment.provider,
      paymentId: payment.paymentId,
      confirmationUrl: payment.confirmationUrl,
      amount: AMOUNT_RUB,
      currency: 'RUB',
      periodDays: PERIOD_DAYS,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'payment_provider_not_configured') {
      return json({
        error: 'Онлайн-оплата ещё не настроена.',
        code: 'payments_not_configured',
      }, 503);
    }

    if (
  error instanceof Error &&
  error.message === 'payment_provider_request_failed'
) {
  console.error('Failed to create YooKassa payment:', {
    status: error.status ?? null,
    code: error.code ?? null,
    description: error.description ?? null,
    parameter: error.parameter ?? null,
  });
} else {
  console.error('Failed to create YooKassa payment:', {
    message: error instanceof Error ? error.message : 'unknown_error',
  });
}

    return json({
      error: 'Не удалось открыть оплату. Попробуйте ещё раз.',
      code: 'payment_create_failed',
    }, 502);
  }
}

export default async (req, context) => handleCreatePayment(req, context);

export const config = { path: '/api/create-payment' };
