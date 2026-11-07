export interface PaymentResult {
  status: string;
  provider: 'yookassa';
  paymentId: string;
  confirmationUrl: string;
  amount: number;
  currency: 'RUB';
  periodDays: number;
}

export async function createPayment(): Promise<PaymentResult> {
  const response = await fetch('/api/create-payment', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === 'string'
        ? payload.error
        : 'Не удалось открыть онлайн-оплату. Попробуйте позже.',
    );
  }

  if (
    payload?.provider !== 'yookassa' ||
    typeof payload?.paymentId !== 'string' ||
    typeof payload?.confirmationUrl !== 'string'
  ) {
    throw new Error('ЮKassa вернула некорректный ответ. Попробуйте ещё раз.');
  }

  return payload as PaymentResult;
}
