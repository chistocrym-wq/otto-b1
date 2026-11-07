export const PAYMENT_RECEIPT_PAYMENT_MODE = 'full_payment';

const ALLOWED_PAYMENT_MODES = new Set([
  'full_payment',
  'full_prepayment',
]);

export function buildPaymentReceipt({
  verifiedEmail,
  amountValue,
  currency,
  paymentMode = PAYMENT_RECEIPT_PAYMENT_MODE,
}) {
  if (!ALLOWED_PAYMENT_MODES.has(paymentMode)) {
    throw new Error('payment_receipt_mode_invalid');
  }

  const email = String(verifiedEmail || '').trim().toLowerCase();
  if (!email) {
    throw new Error('payment_email_required');
  }

  return {
    customer: {
      email,
    },
    items: [      {
        description: 'Доступ к онлайн-тренажёру OTTO A1 на 30 дней',
        quantity: 1,
        amount: {
          value: amountValue,
          currency,
        },
        vat_code: 1,
        payment_subject: 'service',
        payment_mode: paymentMode,
        measure: 'piece',
      },
    ],
    tax_system_code: 2,
  };
}
