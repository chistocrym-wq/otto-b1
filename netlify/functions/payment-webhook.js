import { json } from '../lib/email-otp.js';
import { getPaymentEnvironment, paymentMatchesEnvironment } from '../lib/payment-environment.js';
import { verifyPayment, verifyRefund } from '../lib/payment-provider.js';
import { confirmOttoPaymentAndExtendSubscription } from '../lib/otto-supabase.js';
import { commissionAccounting } from '../lib/preview20-commission-accounting.js';

const AMOUNT_MINOR = 150000;
const PERIOD_DAYS = 30;

export async function handlePaymentWebhook(
  req,
  context,
  {
    verifyPaymentFn = verifyPayment,
    verifyRefundFn = verifyRefund,
    confirmPaymentFn = confirmOttoPaymentAndExtendSubscription,
    commissionAccountingFn = commissionAccounting,
  } = {},
) {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
  }

  const body = await req.json().catch(() => null);

  if (body?.type !== 'notification' || typeof body?.event !== 'string') {
    return json({ status: 'ignored' });
  }

  if (body.event === 'payment.canceled') {
    return json({ status: 'accepted' });
  }

  if (body.event === 'refund.succeeded') {
    const refundId = typeof body?.object?.id === 'string' ? body.object.id : '';
    if (!refundId) return json({code:'refund_id_missing'},400);
    const environment = getPaymentEnvironment(context);
    if (!environment) return json({code:'payments_disabled'},503);
    let refund;
    try {
      refund = await verifyRefundFn({refundId,expectedEnvironment:environment});
    } catch {
      return json({code:'refund_verification_failed'},400);
    }
    // Financial ledger is independently gated. Student entitlement is NOT rolled back.
    if (commissionAccountingFn.gate(req,context)) {
      try { await commissionAccountingFn.confirmedRefund(req,context,refund); }
      catch(error) {
        console.error('Teacher refund accounting deferred', {refundId,
          message:error instanceof Error?error.message:'unknown_error'});
        // Provider can retry this webhook; scheduled SQL reconciliation is also required.
        return json({code:'refund_accounting_retry'},503);
      }
    }
    return json({status:'accepted'});
  }
  if (body.event !== 'payment.succeeded') {
    return json({ status: 'ignored' });
  }

  const paymentId =
    typeof body?.object?.id === 'string'
      ? body.object.id
      : '';

  if (!paymentId) {
    return json({ error: 'Payment id is missing.' }, 400);
  }

  const expectedEnvironment = getPaymentEnvironment(context);
  if (!expectedEnvironment) {
    return json({
      error: 'Payments are disabled in this deploy context.',
      code: 'payments_disabled',
    }, 503);
  }

  let payment;

  try {
    payment = await verifyPaymentFn({
      paymentId,
      expectedAmountMinor: AMOUNT_MINOR,
      expectedCurrency: 'RUB',
      expectedEnvironment,
    });
  } catch (error) {
    console.error('Failed to verify YooKassa payment:', {
      paymentId,
      message: error instanceof Error ? error.message : 'unknown_error',
    });

    return json({
      error: 'Payment verification failed.',
      code: 'payment_verification_failed',
    }, 400);
  }

  if (
    payment.environment !== expectedEnvironment ||
    !paymentMatchesEnvironment(payment.test, expectedEnvironment)
  ) {
    console.error('Rejected YooKassa payment environment mismatch:', {
      paymentId,
      expectedEnvironment,
      paymentEnvironment: payment.environment,
      isTest: payment.test,
    });

    return json({
      error: 'Payment environment mismatch.',
      code: 'payment_environment_mismatch',
    }, 400);
  }

  try {
    const entitlement = await confirmPaymentFn({
      userId: payment.userId,
      environment: expectedEnvironment,
      provider: 'yookassa',
      providerPaymentId: payment.paymentId,
      paymentReference: payment.paymentReference,
      amountMinor: AMOUNT_MINOR,
      currency: 'RUB',
      periodDays: PERIOD_DAYS,
      providerStatus: 'succeeded',
      isTest: payment.test,
    });

    // Optional, isolated accounting AFTER the existing confirmed subscription.
    // Replayed webhooks retry commissions even when entitlement.applied=false.
    // Failure never blocks an already-paid learner; SQL reconciliation repairs it.
    if (commissionAccountingFn.gate(req, context)) {
      try {
        await commissionAccountingFn.confirmedPayment(req, context, payment);
      } catch (accountingError) {
        console.error('Teacher accounting deferred for reconciliation:', {
          paymentId,
          message: accountingError instanceof Error ? accountingError.message : 'unknown_error',
        });
      }
    }

    return json({
      status: 'accepted',
      applied: entitlement.applied,
      subscriptionUntil: entitlement.subscriptionUntil,
    });
  } catch (error) {
    console.error('Failed to persist YooKassa entitlement:', {
      paymentId,
      message: error instanceof Error ? error.message : 'unknown_error',
    });

    return json({
      error: 'Subscription update failed.',
      code: 'subscription_update_failed',
    }, 503);
  }
}

export default async (req, context) => handlePaymentWebhook(req, context);

export const config = { path: '/api/payment-webhook' };
