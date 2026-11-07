import { useState } from 'react';
import { CheckCircle2, CreditCard, ShieldCheck, Sparkles } from 'lucide-react';
import { OttoScene } from '@/components/OttoScene';
import { createPayment } from '@/lib/paymentClient';

interface SubscriptionPanelProps {
  trialEndsAt?: string | null;
  onEditProfile?: () => void;
  onLogout?: () => void;
}

export function SubscriptionPanel({ trialEndsAt = null, onEditProfile, onLogout }: SubscriptionPanelProps) {
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const startPayment = async () => {
    if (loading) return;
    setLoading(true);
    setNotice('');
    try {
      const result = await createPayment();
      window.location.assign(result.confirmationUrl);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось открыть онлайн-оплату. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="otto-responsive-subscription h-[100vh] h-[100dvh] w-full overflow-x-hidden overflow-y-auto overscroll-contain bg-[var(--otto-bg)] px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-[var(--otto-ink)] sm:px-6 sm:py-8 sm:pb-[max(2rem,env(safe-area-inset-bottom))] lg:px-10 lg:py-10">
      <section className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[30px] border border-[var(--otto-line)] bg-[var(--otto-surface)] shadow-[0_24px_70px_rgba(43,54,54,.12)]">
        <div className="relative min-h-[210px] overflow-hidden bg-[var(--otto-petrol-soft)] px-5 pt-6 sm:min-h-[240px] sm:px-7">
          <div className="relative z-10 max-w-[62%]">
            <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-[850] uppercase tracking-[.16em] text-[var(--otto-petrol-dark)]">OTTO A1</span>
            <h1 className="mt-3 text-3xl font-bold leading-[1.04]">Продолжайте путь к A1 вместе с Отто</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--otto-muted)]">Ваш профиль, прогресс, ошибки и место остановки сохраняются.</p>
          </div>
          <OttoScene scene="home" eager className="absolute -bottom-24 -right-10 h-[330px] w-auto max-w-none sm:-bottom-28 sm:right-0 sm:h-[380px]" />
        </div>

        <div className="mx-auto w-full max-w-3xl p-5 sm:p-7">
          <div className="rounded-[24px] border border-[var(--otto-line)] bg-[var(--otto-bg-soft)] p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--otto-surface)] text-[var(--otto-petrol-dark)]"><Sparkles className="h-5 w-5" /></span>
              <div>
                <p className="text-sm font-bold text-[var(--otto-muted)]">Полный доступ</p>
                <strong className="mt-1 block text-3xl">1500 ₽ <span className="text-base font-bold text-[var(--otto-muted)]">/ 30 дней</span></strong>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm leading-6 text-[var(--otto-muted)]">
              <p className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--otto-petrol-dark)]" />Все учебные модули и текущий прогресс.</p>
              <p className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--otto-petrol-dark)]" />Пробный экзамен, готовность и история обучения.</p>
              <p className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--otto-petrol-dark)]" />Подписка будет выдаваться только после подтверждённого сервером платежа.</p>
            </div>
          </div>

          {trialEndsAt && (
            <p className="mt-4 text-center text-xs leading-5 text-[var(--otto-muted)]">
              Пробный период завершён. Дата окончания: {new Date(trialEndsAt).toLocaleString('ru-RU')}.
            </p>
          )}

          <button
            type="button"
            onClick={() => void startPayment()}
            disabled={loading}
            className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--otto-terracotta)] px-5 text-base font-[850] text-white disabled:cursor-wait disabled:opacity-60"
          >
            <CreditCard className="h-5 w-5" />
            {loading ? 'Открываем оплату…' : 'Продолжить с OTTO — 1500 ₽ / 30 дней'}
          </button>

          {notice && (
            <div className="mt-4 rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-petrol-soft)] p-4 text-sm font-semibold leading-6 text-[var(--otto-ink)]" role="status">
              {notice}
            </div>
          )}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {onEditProfile && <button type="button" onClick={onEditProfile} className="min-h-12 rounded-xl border border-[var(--otto-line)] bg-white px-4 font-bold text-[var(--otto-ink)]">Изменить или подтвердить email</button>}
            {onLogout && <button type="button" onClick={onLogout} className="min-h-12 rounded-xl border border-[var(--otto-line)] bg-white px-4 font-bold text-[var(--otto-ink)]">Выйти из аккаунта</button>}
          </div>
        </div>
      </section>
    </main>
  );
}
