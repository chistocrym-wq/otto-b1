import { useEffect, useRef, useState } from 'react';
import {
  loginWithTelegramAuth,
  type SessionResult,
  type TelegramLoginAuth,
} from '@/lib/accessClient';

let widgetSequence = 0;

interface Props {
  botUsername: string;
  onAuthenticated: (session: SessionResult, auth: TelegramLoginAuth) => void;
  onError?: (message: string) => void;
}

export function TelegramLoginButton({
  botUsername,
  onAuthenticated,
  onError,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const authenticatedRef = useRef(onAuthenticated);
  const errorRef = useRef(onError);
  authenticatedRef.current = onAuthenticated;
  errorRef.current = onError;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !botUsername) return undefined;

    widgetSequence += 1;
    const callbackName = `__ottoTelegramLogin_${widgetSequence}`;
    const globalWindow = window as unknown as Window & Record<string, unknown>;

    globalWindow[callbackName] = async (auth: TelegramLoginAuth) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      try {
        const session = await loginWithTelegramAuth(auth);
        if (!session.authenticated) {
          errorRef.current?.(
            session.code === 'telegram_auth_invalid'
              ? 'Telegram не подтвердил вход. Попробуйте ещё раз.'
              : 'Не удалось создать сессию OTTO через Telegram.',
          );
          return;
        }
        authenticatedRef.current(session, auth);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    };

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '10');
    script.setAttribute('data-userpic', 'false');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-onauth', `${callbackName}(user)`);

    host.replaceChildren(script);

    return () => {
      host.replaceChildren();
      delete globalWindow[callbackName];
    };
  }, [botUsername]);

  return (
    <div className="relative min-h-12 w-full">
      <div ref={hostRef} className={busy ? 'pointer-events-none opacity-50' : ''} />
      {busy && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/80 text-sm font-bold text-[var(--otto-petrol-dark)]">
          Входим…
        </div>
      )}
    </div>
  );
}
