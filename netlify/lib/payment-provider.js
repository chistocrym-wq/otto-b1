import { randomUUID } from 'node:crypto';
import { env } from './telegram-access.js';
import { paymentMatchesEnvironment } from './payment-environment.js';
import {
  buildPaymentReceipt,
  PAYMENT_RECEIPT_PAYMENT_MODE,
} from './payment-receipt.js';

const API_BASE = 'https://api.yookassa.ru/v3';
const PAYMENT_REFERENCE_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function credentials() {
  const shopId = env('PAYMENT_PROVIDER_SHOP_ID').trim();
  const secret = env('PAYMENT_PROVIDER_SECRET').trim();

  if (!shopId || !secret) {
    throw new Error('payment_provider_not_configured');
  }

  return { shopId, secret };
}

function authorizationHeader() {
  const { shopId, secret } = credentials();
  return `Basic ${Buffer.from(`${shopId}:${secret}`).toString('base64')}`;
}

function formatMinorUnits(amountMinor) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new Error('payment_amount_invalid');
  }

  const units = Math.floor(amountMinor / 100);
  const fraction = String(amountMinor % 100).padStart(2, '0');
  return `${units}.${fraction}`;
}

function parseMinorUnits(value) {
  if (typeof value !== 'string' || !/^\d+\.\d{2}$/.test(value)) {
    return null;
  }

  const [unitsText, fractionText] = value.split('.');
  const units = Number.parseInt(unitsText, 10);
  const fraction = Number.parseInt(fractionText, 10);
  const amountMinor = units * 100 + fraction;

  return Number.isSafeInteger(amountMinor) ? amountMinor : null;
}

async function yookassaRequest(path, { method = 'GET', body, idempotenceKey } = {}) {
  const headers = {
    Authorization: authorizationHeader(),
    Accept: 'application/json',
  };

  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (idempotenceKey) headers['Idempotence-Key'] = idempotenceKey;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error('payment_provider_request_failed');
    error.status = response.status;
    error.code =
  typeof payload?.code === 'string'
    ? payload.code
    : null;
error.description =
  typeof payload?.description === 'string'
    ? payload.description
    : null;
error.parameter =
  typeof payload?.parameter === 'string'
    ? payload.parameter
    : null;
    throw error;
  }

  return payload;
}

export async function createPayment({
  userId,
  amountMinor,
  currency,
  environment,
  verifiedEmail,
  paymentMode = PAYMENT_RECEIPT_PAYMENT_MODE,
  description,
  returnUrl,
  periodDays = 30,
}) {
  if (environment !== 'test' && environment !== 'live') {
    throw new Error('payment_environment_invalid');
  }

  const amountValue = formatMinorUnits(amountMinor);
  const receipt = buildPaymentReceipt({
    verifiedEmail,
    amountValue,
    currency,
    paymentMode,
  });
  const paymentReference = randomUUID();

  const payment = await yookassaRequest('/payments', {
    method: 'POST',
    idempotenceKey: paymentReference,
    body: {
      amount: {
        value: amountValue,
        currency,
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: returnUrl,
      },
      description,
      receipt,
      metadata: {
        otto_user_id: String(userId),
        otto_payment_reference: paymentReference,
        otto_period_days: String(periodDays),
        otto_environment: environment,
      },
    },
  });

  const confirmationUrl = payment?.confirmation?.confirmation_url;
  if (!payment?.id || typeof confirmationUrl !== 'string' || !confirmationUrl) {
    throw new Error('payment_provider_invalid_response');
  }

  return {
    provider: 'yookassa',
    paymentId: String(payment.id),
    paymentReference,
    status: String(payment.status || 'pending'),
    confirmationUrl,
  };
}

export async function getPaymentStatus(paymentId) {
  if (!paymentId) throw new Error('payment_id_missing');
  return yookassaRequest(`/payments/${encodeURIComponent(String(paymentId))}`);
}

export async function verifyPayment({
  paymentId,
  expectedAmountMinor,
  expectedCurrency,
  expectedEnvironment,
}) {
  if (expectedEnvironment !== 'test' && expectedEnvironment !== 'live') {
    throw new Error('payment_environment_invalid');
  }

  const payment = await getPaymentStatus(paymentId);
  const amountMinor = parseMinorUnits(payment?.amount?.value);

  if (
    payment?.status !== 'succeeded' ||
    payment?.paid !== true ||
    amountMinor !== expectedAmountMinor ||
    payment?.amount?.currency !== expectedCurrency
  ) {
    throw new Error('payment_not_verified');
  }

  const userId =
    typeof payment?.metadata?.otto_user_id === 'string'
      ? payment.metadata.otto_user_id.trim()
      : '';

  const paymentReference =
    typeof payment?.metadata?.otto_payment_reference === 'string'
      ? payment.metadata.otto_payment_reference.trim()
      : '';

  const periodDays = Number.parseInt(
    String(payment?.metadata?.otto_period_days || ''),
    10,
  );

  const environment =
    typeof payment?.metadata?.otto_environment === 'string'
      ? payment.metadata.otto_environment.trim()
      : '';

  if (
    !userId ||
    !PAYMENT_REFERENCE_RE.test(paymentReference) ||
    periodDays !== 30 ||
    (environment !== 'test' && environment !== 'live')
  ) {
    throw new Error('payment_metadata_invalid');
  }

  if (
    typeof payment?.test !== 'boolean' ||
    environment !== expectedEnvironment ||
    !paymentMatchesEnvironment(payment.test, environment)
  ) {
    throw new Error('payment_environment_mismatch');
  }

  return {
    paymentId: String(payment.id),
    userId,
    paymentReference,
    amountMinor,
    currency: payment.amount.currency,
    periodDays,
    status: payment.status,
    test: payment.test,
    environment,
  };
}


// Refund webhook payloads are not trusted; only YooKassa GET may attest a refund.
// YooKassa refund objects may omit "test". Verify the originating payment
// and trust ITS test/live flag and OTTO metadata. If refund.test is present,
// require it to agree with the originating payment.
export async function verifyRefund({refundId,expectedEnvironment}) {
  if(!['test','live'].includes(expectedEnvironment))throw Error('refund_environment_invalid');
  if(typeof refundId!=='string'||refundId.length<5||refundId.length>160)throw Error('refund_id_invalid');
  const refund=await yookassaRequest('/refunds/'+encodeURIComponent(refundId));
  const amountMinor=parseMinorUnits(refund?.amount?.value);
  if(refund?.id!==refundId||refund?.status!=='succeeded'||
     typeof refund?.payment_id!=='string'||!refund.payment_id||
     amountMinor===null||amountMinor<=0||refund?.amount?.currency!=='RUB')
    throw Error('refund_not_verified');

  const original=await getPaymentStatus(refund.payment_id);
  const originalMinor=parseMinorUnits(original?.amount?.value);
  if(original?.id!==refund.payment_id||original?.status!=='succeeded'||
     original?.paid!==true||originalMinor!==150000||
     original?.amount?.currency!=='RUB'||
     typeof original.test!=='boolean'||
     !paymentMatchesEnvironment(original.test,expectedEnvironment)||
     original?.metadata?.otto_environment!==expectedEnvironment||
     (refund.test!==undefined&&refund.test!==original.test))
    throw Error('refund_payment_not_verified');
  if(amountMinor>originalMinor)throw Error('refund_exceeds_payment');
  return {refundId,paymentId:refund.payment_id,amountMinor,environment:expectedEnvironment,
    test:original.test,originalAmountMinor:originalMinor};
}
