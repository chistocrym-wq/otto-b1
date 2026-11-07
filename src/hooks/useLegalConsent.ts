import { useCallback, useEffect, useState } from 'react';
import { LEGAL_DOCUMENT_VERSION, legalAcceptancePayload } from '@/lib/legal';

export function useLegalConsent(enabled: boolean) {
  const [checked, setChecked] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!enabled) {
      setChecked(false);
      setAccepted(false);
      setError('');
      return;
    }

    setChecked(false);
    try {
      const response = await fetch('/api/legal-consent', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const data = await response.json().catch(() => ({}));
      setAccepted(
        response.ok &&
        data.accepted === true &&
        data.documentVersion === LEGAL_DOCUMENT_VERSION,
      );
      setError(response.ok || response.status === 401 ? '' : 'Не удалось проверить юридические согласия.');
    } catch {
      setAccepted(false);
      setError('Не удалось проверить юридические согласия.');
    } finally {
      setChecked(true);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const accept = useCallback(async () => {
    setError('');
    try {
      const response = await fetch('/api/legal-consent', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(legalAcceptancePayload()),
      });
      const data = await response.json().catch(() => ({}));
      const ok =
        response.ok &&
        data.accepted === true &&
        data.documentVersion === LEGAL_DOCUMENT_VERSION;

      if (ok) {
        setAccepted(true);
        return true;
      }

      setError('Не удалось сохранить согласие. Попробуйте ещё раз.');
      return false;
    } catch {
      setError('Не удалось сохранить согласие. Проверьте соединение и попробуйте ещё раз.');
      return false;
    }
  }, []);

  return { ready: enabled ? checked : true, accepted, error, accept, refresh };
}
