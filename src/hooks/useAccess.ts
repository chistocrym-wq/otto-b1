import { useCallback, useEffect, useState } from 'react';
import { getAccessCredentials } from '@/lib/accessClient';

export interface AccessStatus {
  loading: boolean;
  authenticated: boolean;
  telegramUserId: number | null;
  firstName?: string;
  plan: 'free' | 'premium';
  premium: boolean;
  premiumUntil: string | null;
  paymentsConfigured: boolean;
  priceStars: number | null;
  freeContentPercent: number;
  freeAiDailyLimit: number;
  aiUsedToday: number;
  aiRemainingToday: number | null;
  reason?: string;
}

const initialStatus: AccessStatus = {
  loading: true,
  authenticated: false,
  telegramUserId: null,
  plan: 'free',
  premium: false,
  premiumUntil: null,
  paymentsConfigured: false,
  priceStars: null,
  freeContentPercent: 50,
  freeAiDailyLimit: 3,
  aiUsedToday: 0,
  aiRemainingToday: 3,
};

export function useAccess() {
  const [status, setStatus] = useState<AccessStatus>(initialStatus);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const credentials = getAccessCredentials();
      const response = await fetch('/api/access-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload) throw new Error(payload?.error || 'Не удалось проверить доступ. Попробуйте ещё раз.');
      setStatus({ ...initialStatus, ...payload, loading: false });
    } catch {
      setStatus((previous) => ({ ...previous, loading: false }));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    setPurchaseLoading(true);
    setPurchaseError('');
    try {
      const credentials = getAccessCredentials();
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.invoiceLink) {
        throw new Error(payload?.error || 'Не удалось открыть оплату. Попробуйте ещё раз.');
      }

      const telegram = window.Telegram?.WebApp;
      if (!telegram?.openInvoice) {
        throw new Error('Оформить подписку можно в OTTO внутри Telegram.');
      }

      await new Promise<void>((resolve, reject) => {
        telegram.openInvoice?.(payload.invoiceLink, (invoiceStatus) => {
          if (invoiceStatus === 'paid') resolve();
          else if (invoiceStatus === 'cancelled') reject(new Error('Оплата отменена.'));
          else if (invoiceStatus === 'failed') reject(new Error('Telegram не завершил оплату. Попробуйте ещё раз.'));
          else resolve();
        });
      });

      for (let attempt = 0; attempt < 5; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 1200));
        const check = await fetch('/api/access-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(getAccessCredentials()),
        });
        const next = await check.json().catch(() => null);
        if (check.ok && next) {
          setStatus({ ...initialStatus, ...next, loading: false });
          if (next.premium) break;
        }
      }
    } catch (error) {
      setPurchaseError(error instanceof Error ? error.message : 'Не удалось оформить подписку.');
    } finally {
      setPurchaseLoading(false);
    }
  }, []);

  return { status, refresh, subscribe, purchaseLoading, purchaseError };
}
