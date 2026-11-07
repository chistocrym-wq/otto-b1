import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, Send, Sparkles, X } from 'lucide-react';
import { OttoScene } from '@/components/OttoScene';
import { LegalDocumentsModal } from '@/components/LegalDocumentsModal';
import { TelegramLoginButton } from '@/components/TelegramLoginButton';
import { useAccess } from '@/hooks/useAccess';
import type { ContactType, Gender, LearningMode, UserProfile, UserProfileDraft } from '@/hooks/useUserProfile';
import { cn } from '@/lib/utils';
import { bootstrapTelegramSession, clearExplicitLogout } from '@/lib/accessClient';
import { LEGAL_DOCUMENT_VERSION, legalAcceptancePayload, type LegalDocumentId } from '@/lib/legal';

interface Props {
  onComplete: (profile: UserProfileDraft) => boolean | Promise<boolean>;
  initialProfile?: UserProfile | null;
  authenticatedSession?: boolean;
  saveError?: string | null;
  onCancel?: () => void;
  initialStep?: 'login'|'welcome';
  onGuest?:()=>void;
}

type Step = 'welcome' | 'login' | 'profile' | 'otp' | 'mode';
type BusyState = 'request' | 'verify' | 'legal' | 'profile' | null;
type AuthIntent = 'register' | 'login';

const serifFont={fontFamily:'Georgia, "Times New Roman", serif'};
const sansFont={fontFamily:'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'};

const TELEGRAM_BOT_USERNAME = 'ottoA1_bot';
const TELEGRAM_MINI_APP_URL = String(import.meta.env.VITE_TELEGRAM_MINI_APP_URL || '').trim();

function getTelegramMiniAppUrl() {
  if (!TELEGRAM_MINI_APP_URL) return '';
  try {
    const url = new URL(TELEGRAM_MINI_APP_URL);
    if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 't.me') return '';
    if (url.pathname.toLowerCase() !== `/${TELEGRAM_BOT_USERNAME.toLowerCase()}`) return '';
    if (!url.searchParams.has('startapp')) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(value.trim());
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isGmailEmail(value: string) {
  const normalized = normalizeEmail(value);
  const at = normalized.lastIndexOf('@');
  return at > 0 && normalized.slice(at + 1) === 'gmail.com';
}

function maskEmail(value: string) {
  const normalized = normalizeEmail(value);
  const at = normalized.indexOf('@');
  if (at <= 0) return normalized;
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

function otpMessage(code?: string) {
  if (code === 'invalid_code') return 'Код не подходит. Проверьте цифры и попробуйте ещё раз.';
  if (code === 'expired' || code === 'used') return 'Срок действия кода истёк. Отправьте новый код.';
  if (code === 'too_many_attempts') return 'Слишком много неверных попыток. Отправьте новый код.';
  if (code === 'account_sync_failed') return 'Код подтверждён, но сервер временно недоступен. Ваш аккаунт и прогресс сохранены. Когда соединение восстановится, запросите новый код — регистрироваться заново не нужно.';
  if (code === 'otp_service_unavailable' || code === 'account_lookup_failed') return 'Сервис входа временно недоступен. Попробуйте позже — это не ошибка кода.';
  if (code === 'identity_conflict') return 'Этот e-mail и Telegram уже связаны с разными аккаунтами OTTO. Обратитесь в поддержку, чтобы безопасно объединить аккаунты.';
  return 'Не удалось проверить код. Попробуйте ещё раз.';
}

export function Onboarding({ onComplete, initialProfile = null, authenticatedSession = false, saveError, onCancel, initialStep, onGuest }: Props) {
  const { status } = useAccess();
  const [step, setStep] = useState<Step>(initialProfile || authenticatedSession ? 'profile' : (initialStep ?? 'welcome'));
  const [authIntent, setAuthIntent] = useState<AuthIntent>('register');
  const [existingEmailNotice, setExistingEmailNotice] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<'loading' | 'ready' | 'failed'>(authenticatedSession && !initialProfile ? 'loading' : 'ready');
  const [recoveryAttempt, setRecoveryAttempt] = useState(0);
  const [name, setName] = useState(initialProfile?.name ?? status.firstName ?? '');
  const [contactType, setContactType] = useState<ContactType>(initialProfile?.contactType ?? 'email');
  const [contact, setContact] = useState(initialProfile?.contact ?? '');
  const [gender, setGender] = useState<Gender | null>(initialProfile?.gender ?? null);
  const [mode, setMode] = useState<LearningMode>(initialProfile?.learningMode ?? 'guided');
  const [verifiedEmail, setVerifiedEmail] = useState(
    initialProfile?.contactType === 'email' && initialProfile.contactVerified ? normalizeEmail(initialProfile.contact) : '',
  );
  const [challengeId, setChallengeId] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(() => Array(6).fill(''));
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpNeedsNewCode, setOtpNeedsNewCode] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [busy, setBusy] = useState<BusyState>(null);
  const [sendFailed, setSendFailed] = useState(false);
  const [showDelayHint, setShowDelayHint] = useState(false);
  const [telegramSessionAuthenticated, setTelegramSessionAuthenticated] = useState(false);
  const [telegramSessionUserId, setTelegramSessionUserId] = useState<number | null>(null);
  const [personalDataAccepted, setPersonalDataAccepted] = useState(false);
  const [legalDocument, setLegalDocument] = useState<LegalDocumentId | null>(null);
  const [gmailAdviceOpen, setGmailAdviceOpen] = useState(false);
  const [gmailAdviceDismissed, setGmailAdviceDismissed] = useState(false);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  const telegramUserIdPresent = typeof telegramSessionUserId === 'number' && Number.isSafeInteger(telegramSessionUserId) && telegramSessionUserId > 0;
  const telegramVerified = contactType === 'telegram' && telegramUserIdPresent && telegramSessionAuthenticated;
  const telegramMiniAppUrl = getTelegramMiniAppUrl();
  // Browser-only escape hatch when Telegram's external Login Widget rejects
  // a site domain. Never change the working Mini App / initData auth path.
  const telegramFallbackUrl = telegramMiniAppUrl || `https://t.me/${TELEGRAM_BOT_USERNAME}`;
  const telegramInitDataPresent = Boolean(window.Telegram?.WebApp?.initData);
  const normalizedEmail = normalizeEmail(contact);
  const emailVerified = contactType === 'email' && Boolean(verifiedEmail) && verifiedEmail === normalizedEmail;

  const contactValid = useMemo(() => {
    if (contactType === 'email') return validEmail(contact);
    return telegramVerified;
  }, [contact, contactType, telegramVerified]);
  const genderRequired = !initialProfile;
  const profileValid = name.trim().length >= 2 && contactValid && (!genderRequired || gender !== null);
  const registrationConsentRequired = !initialProfile && !authenticatedSession && authIntent === 'register';
  const canContinueProfile = profileValid && (!registrationConsentRequired || personalDataAccepted) && (!authenticatedSession || recoveryStatus === 'ready');
  const loginValid = validEmail(contact);
  const otpValue = otpDigits.join('');

  useEffect(() => {
    let cancelled = false;
    if (authenticatedSession && !initialProfile) return undefined;
    void bootstrapTelegramSession().then((session) => {
      if (cancelled) return;
      setTelegramSessionAuthenticated(session.authenticated === true);
      setTelegramSessionUserId(session.telegramUserId ?? null);
      if (
        authenticatedSession &&
        !initialProfile &&
        session.authenticated === true &&
        session.telegramUserId
      ) {
        setContactType('telegram');
      }
    });
    return () => { cancelled = true; };
  }, [authenticatedSession, initialProfile]);

  // A valid existing session is authoritative. Never re-register or request a
  // second OTP just because its profile row has not been written yet.
  useEffect(() => {
    if (!authenticatedSession || initialProfile) return undefined;
    let cancelled = false;
    setRecoveryStatus('loading');
    setOtpError(null);
    void fetch('/api/session', { credentials: 'same-origin', cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('session_unavailable');
        const session = await response.json();
        if (session?.authenticated !== true) throw new Error('session_not_confirmed');
        if (cancelled) return;
        if (typeof session.verifiedEmail === 'string' && validEmail(session.verifiedEmail)) {
          const email = normalizeEmail(session.verifiedEmail);
          setContactType('email');
          setContact(email);
          setVerifiedEmail(email);
          setRecoveryStatus('ready');
          return;
        }
        const telegramId = Number(session.telegramUserId);
        if (Number.isSafeInteger(telegramId) && telegramId > 0) {
          setTelegramSessionAuthenticated(true);
          setTelegramSessionUserId(telegramId);
          setContactType('telegram');
          setRecoveryStatus('ready');
          return;
        }
        throw new Error('verified_contact_not_available');
      })
      .catch(() => { if (!cancelled) setRecoveryStatus('failed'); });
    return () => { cancelled = true; };
  }, [authenticatedSession, initialProfile, recoveryAttempt]);

  useEffect(() => {
    if (step !== 'otp' || resendSeconds <= 0) return undefined;
    const id = window.setInterval(() => {
      setResendSeconds((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendSeconds, step]);

  useEffect(() => {
    if (step !== 'otp' || !challengeId) {
      setShowDelayHint(false);
      return undefined;
    }
    setShowDelayHint(false);
    const id = window.setTimeout(() => setShowDelayHint(true), 75_000);
    return () => window.clearTimeout(id);
  }, [challengeId, step]);

  const requestOtp = async (intent: AuthIntent = authIntent) => {
    if (authenticatedSession) return;
    const canRequest = contactType === 'email' && loginValid && (intent === 'login' || canContinueProfile);
    if (!canRequest || busy) return;
    setBusy('request');
    setOtpError(null);
    setSendFailed(false);
    try {
      const response = await fetch('/api/email-otp-request', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          intent,
          ...(intent === 'register' ? { legalAcceptance: legalAcceptancePayload() } : {}),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.challengeId !== 'string') {
        if (data.code === 'email_registered') {
          setAuthIntent('login');
          setExistingEmailNotice(true);
          setStep('login');
          setOtpError(null);
        } else if (data.code === 'legal_consent_required') {
          setOtpError('Чтобы зарегистрироваться, подтвердите отдельное согласие на обработку персональных данных.');
        } else if (data.code === 'account_not_found') {
          setOtpError('Аккаунт с таким e-mail не найден. Проверьте адрес или зарегистрируйтесь.');
        } else if (response.status === 429 && Number(data.retryAfter) > 0) {
          setResendSeconds(Number(data.retryAfter));
          setOtpError(`Код можно отправить повторно через ${Number(data.retryAfter)} сек.`);
        } else if (data.code === 'account_lookup_failed') {
          setOtpError(otpMessage(data.code));
        } else {
          setOtpError('Не удалось отправить код.');
          setSendFailed(true);
        }
        return;
      }
      setAuthIntent(intent);
      setExistingEmailNotice(false);
      setChallengeId(data.challengeId);
      setOtpNeedsNewCode(false);
      setOtpDigits(Array(6).fill(''));
      setSendFailed(false);
      setShowDelayHint(false);
      setResendSeconds(Number(data.resendAfter) > 0 ? Number(data.resendAfter) : 60);
      setStep('otp');
      window.setTimeout(() => otpRefs.current[0]?.focus(), 0);
    } catch {
      setOtpError('Не удалось отправить код.');
      setSendFailed(true);
    } finally {
      setBusy(null);
    }
  };

  const continueProfile = () => {
    if (!canContinueProfile || busy) return;
    if (authenticatedSession) {
      if (emailVerified || telegramVerified) setStep('mode');
      else setOtpError('Не удалось проверить подтверждённый контакт. Повторная регистрация не нужна — повторите проверку сессии.');
      return;
    }
    if (contactType === 'email') {
      if (emailVerified) {
        setStep('mode');
      } else if (
        authIntent === 'register' &&
        !initialProfile &&
        !authenticatedSession &&
        isGmailEmail(normalizedEmail) &&
        !gmailAdviceDismissed
      ) {
        setGmailAdviceOpen(true);
      } else {
        void requestOtp('register');
      }
      return;
    }
    if (telegramVerified) setStep('mode');
  };

  const dismissGmailAdvice = () => {
    setGmailAdviceDismissed(true);
    setGmailAdviceOpen(false);
  };

  const chooseDifferentRegistrationEmail = () => {
    dismissGmailAdvice();
    window.setTimeout(() => emailInputRef.current?.focus(), 0);
  };

  const continueRegistrationWithGmail = () => {
    dismissGmailAdvice();
    void requestOtp('register');
  };

  const verifyOtp = async () => {
    if (busy || otpValue.length !== 6 || !challengeId) return;
    setBusy('verify');
    setOtpError(null);
    try {
      const response = await fetch('/api/email-otp-verify', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          challengeId,
          email: normalizedEmail,
          code: otpValue,
          initData: window.Telegram?.WebApp?.initData || '',
          ...(authIntent === 'register' ? { legalAcceptance: legalAcceptancePayload() } : {}),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.verified !== true) {
        setOtpError(otpMessage(data.code));
        if (data.code === 'account_sync_failed') {
          setOtpNeedsNewCode(true);
          setOtpDigits(Array(6).fill(''));
          setChallengeId('');
          setResendSeconds(0);
        }
        if (data.code === 'expired' || data.code === 'used' || data.code === 'too_many_attempts') {
          setChallengeId('');
          setResendSeconds(0);
        }
        return;
      }
      clearExplicitLogout();
      setVerifiedEmail(normalizedEmail);
      setChallengeId('');
      setOtpDigits(Array(6).fill(''));
      if (authIntent === 'login') {
        window.location.reload();
        return;
      }
      setStep('mode');
    } catch {
      setOtpError('Не удалось связаться с сервером. Если код уже подтверждён, запросите новый код после восстановления соединения.');
      setOtpNeedsNewCode(true);
      setChallengeId('');
      setResendSeconds(0);
    } finally {
      setBusy(null);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/gu, '').slice(-1);
    setOtpDigits((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });
    setOtpError(null);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Backspace') return;
    if (otpDigits[index]) return;
    if (index > 0) {
      setOtpDigits((current) => {
        const next = [...current];
        next[index - 1] = '';
        return next;
      });
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const digits = event.clipboardData.getData('text').replace(/\D/gu, '').slice(0, 6);
    if (!digits) return;
    event.preventDefault();
    const next = Array(6).fill('');
    digits.split('').forEach((digit, index) => { next[index] = digit; });
    setOtpDigits(next);
    setOtpError(null);
    otpRefs.current[Math.min(digits.length, 6) - 1]?.focus();
  };

  const cancelCurrentChallenge = async () => {
    if (!challengeId || !validEmail(normalizedEmail)) return;
    try {
      await fetch('/api/email-otp-cancel', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ challengeId, email: normalizedEmail }),
      });
    } catch {
      // Cancellation is best-effort for UX; server TTL still limits an unreachable challenge.
    }
  };

  const changeEmail = async () => {
    await cancelCurrentChallenge();
    setChallengeId('');
    setOtpDigits(Array(6).fill(''));
    setOtpNeedsNewCode(false);
    setOtpError(null);
    setResendSeconds(0);
    setSendFailed(false);
    setShowDelayHint(false);
    setStep(authIntent === 'login' ? 'login' : 'profile');
    window.setTimeout(() => emailInputRef.current?.focus(), 0);
  };

  const save = async () => {
    if (!canContinueProfile || busy) return;
    if (contactType === 'email' && !emailVerified) return;
    if (contactType === 'telegram' && !telegramVerified) return;

    if (registrationConsentRequired) {
      setBusy('legal');
      setOtpError(null);
      try {
        const response = await fetch('/api/legal-consent', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(legalAcceptancePayload()),
        });
        const data = await response.json().catch(() => ({}));
        if (
          !response.ok ||
          data.accepted !== true ||
          data.documentVersion !== LEGAL_DOCUMENT_VERSION
        ) {
          setOtpError('Не удалось зафиксировать согласие. Проверьте соединение и попробуйте ещё раз.');
          return;
        }
      } catch {
        setOtpError('Не удалось зафиксировать согласие. Проверьте соединение и попробуйте ещё раз.');
        return;
      } finally {
        setBusy(null);
      }
    }

    setBusy('profile');
    setOtpError(null);
    try {
      const completed = await onComplete({
        name: name.trim(),
        contactType,
        contact: contactType === 'email' ? normalizedEmail : String(telegramSessionUserId),
        contactVerified: contactType === 'email' ? emailVerified : true,
        authStatus: 'verified',
        gender: gender ?? initialProfile?.gender,
        learningMode: mode,
      });

      if (!completed) {
        setOtpError('Не удалось подтвердить сохранение профиля. Email уже подтверждён: не регистрируйтесь заново, попробуйте сохранить профиль ещё раз.');
      }
    } catch {
      setOtpError('Не удалось подтвердить сохранение профиля. Повторная регистрация не нужна. Проверьте соединение и повторите сохранение.');
    } finally {
      setBusy(null);
    }
  };

  const progressStep = step === 'otp' ? (authIntent === 'login' ? 'welcome' : 'profile') : step === 'login' ? 'welcome' : step;

  return (
    <main className="otto-responsive-auth h-[100dvh] overflow-x-hidden overflow-y-auto overscroll-contain bg-[var(--otto-bg)] px-4 py-5 text-[var(--otto-ink)] sm:px-6 sm:py-8" style={sansFont}>
      <div className="mx-auto flex min-h-full w-full max-w-xl flex-col justify-start pb-[max(1rem,env(safe-area-inset-bottom))] sm:justify-center">
        {onCancel && (
          <button type="button" onClick={onCancel} className="mb-3 inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-[var(--otto-line)] bg-[var(--otto-surface)] px-4 text-sm font-bold text-[var(--otto-ink)]">
            <ArrowLeft className="h-4 w-4" /> Назад
          </button>
        )}

        <section className="overflow-hidden rounded-[30px] border border-[var(--otto-line)] bg-[var(--otto-surface)] shadow-[0_24px_70px_rgba(43,54,54,.12)]">
          <div className="grid min-h-[170px] grid-cols-[minmax(0,1fr)_minmax(90px,30%)] items-end gap-2 overflow-hidden bg-[var(--otto-petrol-soft)] px-4 pt-4 sm:min-h-[205px] sm:gap-4 sm:px-7 sm:pt-5">
            <div className="min-w-0 pb-4 sm:pb-6">
              <span className="inline-flex rounded-full bg-[var(--otto-surface)] px-3 py-1 text-[11px] font-[850] uppercase tracking-[.12em] text-[var(--otto-petrol-dark)]">OTTO A1</span>
              <h1 className="mt-3 break-words font-bold text-[clamp(1.25rem,3.25vw,1.875rem)] leading-[1.12] text-[var(--otto-ink)]" style={serifFont}>Подготовка к экзамену — шаг за шагом</h1>
            </div>
            <OttoScene scene="home" eager className="h-[155px] w-auto max-w-full self-end justify-self-end object-contain object-bottom sm:h-[200px]" />
          </div>

          <div className="p-5 sm:p-7">
            <div className="mb-5 flex gap-2" aria-label="Шаги регистрации">
              {(['welcome', 'profile', 'mode'] as const).map((item, index) => {
                const order = ['welcome', 'profile', 'mode'] as const;
                const active = order.indexOf(progressStep as 'welcome' | 'profile' | 'mode') >= index;
                return <span key={item} className={cn('h-1.5 flex-1 rounded-full transition-colors', active ? 'bg-[var(--otto-petrol)]' : 'bg-[var(--otto-sand)]')} />;
              })}
            </div>

            {step === 'welcome' && (
              <div className="animate-fade-in">
                <div className="flex items-center gap-2 text-[var(--otto-petrol-dark)]"><Sparkles className="h-5 w-5" /><b>Привет! Я Отто.</b></div>
                <p className="mt-3 text-base leading-7 text-[var(--otto-muted)]">Я помогу подготовиться к A1 шаг за шагом: будем тренироваться, разбирать ошибки и повышать готовность к экзамену.</p>
                <button type="button" onClick={() => { setAuthIntent('register'); setExistingEmailNotice(false); setStep('profile'); }} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--otto-petrol-dark)] px-5 font-[850] text-white">
                  Новый пользователь — регистрация <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => { setAuthIntent('login'); setExistingEmailNotice(false); setContactType('email'); setOtpError(null); setStep('login'); }} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--otto-line)] bg-[var(--otto-surface)] px-4 text-sm font-bold text-[var(--otto-petrol-dark)]">
                  Уже есть аккаунт — Войти
                </button>
              </div>
            )}

            {onGuest && step === 'welcome' && <button type="button" onClick={onGuest} className="mt-3 min-h-12 w-full rounded-xl border-2 border-[#176554] bg-white px-4 font-bold text-[#176554]">Попробовать без регистрации</button>}
            {step === 'login' && (
              <div className="animate-fade-in">
                <p className="text-xs font-[850] uppercase tracking-[.14em] text-[var(--otto-petrol-dark)]">Вход в OTTO</p>
                <h2 className="mt-1 text-2xl font-bold leading-[1.08] text-[var(--otto-ink)]" style={serifFont}>Войти по e-mail</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--otto-muted)]">
                  {existingEmailNotice ? 'Этот e-mail уже зарегистрирован в OTTO.' : 'Введите e-mail существующего аккаунта. Постоянный пароль не нужен — мы отправим одноразовый код.'}
                </p>
                <label className="mt-5 block text-sm font-bold text-[var(--otto-ink)]">
                  Email
                  <input ref={emailInputRef} value={contact} onChange={(event) => { setContact(event.target.value); setOtpError(null); setSendFailed(false); setExistingEmailNotice(false); }} inputMode="email" autoComplete="email" placeholder="name@example.com" className="mt-2 min-h-12 w-full rounded-xl border border-[var(--otto-line-strong)] bg-[var(--otto-surface-strong)] px-4 text-base text-[var(--otto-ink)] outline-none focus:border-[var(--otto-petrol)] focus:ring-2 focus:ring-[var(--otto-petrol)]/15" />
                </label>
                {otpError && <p className="mt-2 text-sm font-semibold text-[var(--otto-danger)]" role="alert">{otpError}</p>}
                <button type="button" disabled={!loginValid || busy !== null} onClick={() => void requestOtp('login')} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--otto-petrol-dark)] px-5 font-[850] text-white disabled:cursor-not-allowed disabled:opacity-35">
                  {busy === 'request' ? 'Отправляем код…' : 'Войти'} <ArrowRight className="h-4 w-4" />
                </button>
                {!telegramInitDataPresent && (
                  <>
                    <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[.12em] text-[var(--otto-muted)]">
                      <span className="h-px flex-1 bg-[var(--otto-line)]" />
                      или
                      <span className="h-px flex-1 bg-[var(--otto-line)]" />
                    </div>
                    <div className="rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-petrol-soft)] p-4">
                      <p className="mb-3 text-center text-sm font-bold text-[var(--otto-ink)]">Войти через Telegram</p>
                      <TelegramLoginButton
                        botUsername={TELEGRAM_BOT_USERNAME}
                        onAuthenticated={() => {
                          window.location.reload();
                        }}
                        onError={(message) => setOtpError(message)}
                      />
                      <p className="mt-3 text-center text-xs leading-5 text-[var(--otto-muted)]">
                        Если здесь появляется ошибка Telegram, откройте OTTO через бота. Вход по e-mail по-прежнему доступен.
                      </p>
                      <a href={telegramFallbackUrl} target="_blank" rel="noopener noreferrer" onClick={clearExplicitLogout} className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[var(--otto-line)] bg-[var(--otto-surface)] px-4 text-center text-sm font-bold text-[var(--otto-petrol-dark)]">
                        {telegramMiniAppUrl ? 'Открыть OTTO в Telegram' : 'Открыть бота OTTO в Telegram'}
                      </a>
                    </div>
                  </>
                )}
                <button type="button" disabled={busy !== null} onClick={() => { setAuthIntent('register'); setExistingEmailNotice(false); setOtpError(null); setStep('profile'); }} className="mt-2 min-h-11 w-full rounded-xl px-4 text-sm font-bold text-[var(--otto-muted)] disabled:opacity-45">
                  Создать новый аккаунт
                </button>
              </div>
            )}

            {step === 'profile' && (
              <div className="animate-fade-in">
                <p className="text-xs font-[850] uppercase tracking-[.14em] text-[var(--otto-petrol-dark)]">Профиль</p>
                <h2 className="mt-1 text-2xl font-bold leading-[1.08] text-[var(--otto-ink)]" style={serifFont}>{authenticatedSession && !initialProfile ? 'Завершите оформление профиля' : 'Как к вам обращаться?'}</h2>
                {authenticatedSession && !initialProfile && <p className="mt-3 text-sm leading-6 text-[var(--otto-muted)]">Ваш аккаунт и подтверждение входа сохранены. Укажите имя, пол и режим обучения. Повторный код Email не нужен.</p>}
                {authenticatedSession && recoveryStatus === 'loading' && <p role="status" className="mt-3 text-sm text-[var(--otto-muted)]">Проверяем подтверждённый контакт аккаунта…</p>}
                {authenticatedSession && recoveryStatus === 'failed' && <div role="alert" className="mt-3 rounded-xl border border-amber-300 p-3 text-sm text-amber-900">Не удалось получить подтверждённый контакт существующей сессии. Профиль пока не сохранён, повторная регистрация не требуется.<button type="button" className="mt-2 block font-bold underline" onClick={() => setRecoveryAttempt(n => n + 1)}>Повторить проверку сессии</button></div>}
                <label className="mt-5 block text-sm font-bold text-[var(--otto-ink)]">
                  Имя
                  <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={60} placeholder="Например, Анна" className="mt-2 min-h-12 w-full rounded-xl border border-[var(--otto-line-strong)] bg-[var(--otto-surface-strong)] px-4 text-base text-[var(--otto-ink)] outline-none focus:border-[var(--otto-petrol)] focus:ring-2 focus:ring-[var(--otto-petrol)]/15" />
                </label>

                <fieldset className="mt-5">
                  <legend className="text-sm font-bold text-[var(--otto-ink)]">Ваш пол</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setGender('female')} aria-pressed={gender === 'female'} className={cn('min-h-12 rounded-xl border px-3 font-bold', gender === 'female' ? 'border-[var(--otto-petrol)] bg-[var(--otto-petrol-soft)] text-[var(--otto-petrol-dark)]' : 'border-[var(--otto-line)] bg-[var(--otto-surface)] text-[var(--otto-muted)]')}>Женский</button>
                    <button type="button" onClick={() => setGender('male')} aria-pressed={gender === 'male'} className={cn('min-h-12 rounded-xl border px-3 font-bold', gender === 'male' ? 'border-[var(--otto-petrol)] bg-[var(--otto-petrol-soft)] text-[var(--otto-petrol-dark)]' : 'border-[var(--otto-line)] bg-[var(--otto-surface)] text-[var(--otto-muted)]')}>Мужской</button>
                  </div>
                </fieldset>

                <fieldset className="mt-5">
                  <legend className="text-sm font-bold text-[var(--otto-ink)]">Контакт</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" disabled={authenticatedSession && !initialProfile} onClick={() => { setContactType('email'); setOtpError(null); }} aria-pressed={contactType === 'email'} className={cn('min-h-12 rounded-xl border px-3 font-bold', contactType === 'email' ? 'border-[var(--otto-petrol)] bg-[var(--otto-petrol-soft)] text-[var(--otto-petrol-dark)]' : 'border-[var(--otto-line)] bg-[var(--otto-surface)] text-[var(--otto-muted)]')}><Mail className="mr-2 inline h-4 w-4" />Email</button>
                    <button type="button" disabled={authenticatedSession && !initialProfile} onClick={() => { clearExplicitLogout(); setContactType('telegram'); setOtpError(null); setChallengeId(''); if (telegramInitDataPresent) { void bootstrapTelegramSession({ createIfMissing: true }).then((session) => { setTelegramSessionAuthenticated(session.authenticated === true); setTelegramSessionUserId(session.telegramUserId ?? null); }); } }} aria-pressed={contactType === 'telegram'} className={cn('min-h-12 rounded-xl border px-3 font-bold', contactType === 'telegram' ? 'border-[var(--otto-petrol)] bg-[var(--otto-petrol-soft)] text-[var(--otto-petrol-dark)]' : 'border-[var(--otto-line)] bg-[var(--otto-surface)] text-[var(--otto-muted)]')}><Send className="mr-2 inline h-4 w-4" />Telegram</button>
                  </div>
                </fieldset>

                {contactType === 'email' ? (
                  <label className="mt-4 block text-sm font-bold text-[var(--otto-ink)]">
                    Email
                    <input ref={emailInputRef} value={contact} readOnly={authenticatedSession && !initialProfile} onChange={(event) => { setContact(event.target.value); setOtpError(null); setSendFailed(false); }} inputMode="email" autoComplete="email" placeholder="name@example.com" className="mt-2 min-h-12 w-full rounded-xl border border-[var(--otto-line-strong)] bg-[var(--otto-surface-strong)] px-4 text-base text-[var(--otto-ink)] outline-none focus:border-[var(--otto-petrol)] focus:ring-2 focus:ring-[var(--otto-petrol)]/15" />
                    {authenticatedSession && emailVerified && <span className="mt-2 block text-xs font-semibold text-emerald-700">✓ Email подтверждён. Повторный код не требуется.</span>}
                    {authIntent === 'register' && !initialProfile && !authenticatedSession && (
                      <span className="mt-2 block text-xs font-normal leading-5 text-[var(--otto-muted)]">Для более быстрой доставки кода рекомендуем Яндекс Почту или Mail.ru.</span>
                    )}
                  </label>
                ) : telegramVerified ? (
                  <div className="mt-4 rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-sage-soft)] p-4 text-sm text-[var(--otto-petrol-dark)]"><div className="flex items-center gap-2 font-[850]"><CheckCircle2 className="h-5 w-5" />✓ Telegram подтверждён</div><p className="mt-1 leading-6">Telegram подтверждён{status.firstName ? `: ${status.firstName}` : ''}.</p></div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-petrol-soft)] p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--otto-surface)] text-[var(--otto-petrol-dark)]"><Send className="h-5 w-5" /></span>
                      <div className="min-w-0">
                        <strong className="block text-base text-[var(--otto-ink)]">Подтверждение через Telegram</strong>
                        <p className="mt-1 text-sm leading-6 text-[var(--otto-muted)]">
                          {status.loading && telegramInitDataPresent
                            ? 'Проверяем ваш Telegram-аккаунт…'
                            : telegramInitDataPresent && status.authenticated
                              ? 'Telegram подтверждён. Чтобы создать или безопасно связать единый аккаунт OTTO, подтвердите e-mail один раз. Telegram привяжется автоматически.'
                              : `Откройте OTTO в Telegram через @${TELEGRAM_BOT_USERNAME}. Уже связанный Telegram войдёт автоматически.`}
                        </p>
                      </div>
                    </div>
                    {!telegramVerified && (
                      telegramInitDataPresent ? (
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={() => {
                              clearExplicitLogout();
                              void bootstrapTelegramSession({ createIfMissing: true }).then((session) => {
                                setTelegramSessionAuthenticated(session.authenticated === true);
                                setTelegramSessionUserId(session.telegramUserId ?? null);
                                if (!session.authenticated) {
                                  setOtpError('Не удалось создать сессию OTTO через Telegram. Попробуйте закрыть и снова открыть Mini App.');
                                }
                              });
                            }}
                            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--otto-petrol-dark)] px-5 font-[850] text-white"
                          >
                            Подтвердить Telegram <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="mt-4 rounded-xl bg-[var(--otto-surface)] p-3">
                            <TelegramLoginButton
                              botUsername={TELEGRAM_BOT_USERNAME}
                              onAuthenticated={(session, auth) => {
                                setTelegramSessionAuthenticated(true);
                                setTelegramSessionUserId(session.telegramUserId ?? auth.id);
                                if (!name.trim() && auth.first_name) setName(auth.first_name);
                                setOtpError(null);
                              }}
                              onError={(message) => setOtpError(message)}
                            />
                          </div>
                          {telegramMiniAppUrl ? (
                            <button type="button" onClick={() => { clearExplicitLogout(); window.location.assign(telegramMiniAppUrl); }} className="mt-3 min-h-11 w-full rounded-xl border border-[var(--otto-line)] bg-[var(--otto-surface)] px-4 text-sm font-bold text-[var(--otto-petrol-dark)]">
                              Открыть OTTO внутри Telegram
                            </button>
                          ) : (
                            <a href={telegramFallbackUrl} target="_blank" rel="noopener noreferrer" onClick={clearExplicitLogout} className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[var(--otto-line)] bg-[var(--otto-surface)] px-4 text-center text-sm font-bold text-[var(--otto-petrol-dark)]">
                              Открыть бота OTTO в Telegram
                            </a>
                          )}
                          <button type="button" onClick={() => { setContactType('email'); setOtpError(null); }} className="mt-2 min-h-11 w-full rounded-xl px-4 text-sm font-bold text-[var(--otto-petrol-dark)]">Выбрать Email вместо Telegram</button>
                        </>
                      )
                    )}
                  </div>
                )}

                {registrationConsentRequired && (
                  <div className="mt-5 rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-surface-strong)] p-4">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={personalDataAccepted}
                        onChange={(event)=>{setPersonalDataAccepted(event.target.checked);setOtpError(null)}}
                        className="mt-1 h-5 w-5 shrink-0 accent-[var(--otto-petrol-dark)]"
                      />
                      <span className="text-sm leading-6 text-[var(--otto-ink)]">
                        Я даю согласие на обработку моих персональных данных.
                      </span>
                    </label>
                    <button type="button" onClick={()=>setLegalDocument('consent')} className="mt-2 text-left text-sm font-bold text-[var(--otto-petrol-dark)] underline underline-offset-2">
                      Прочитать согласие на обработку персональных данных
                    </button>
                    <p className="mt-3 text-xs leading-5 text-[var(--otto-muted)]">
                      Продолжая регистрацию, вы принимаете{' '}
                      <button type="button" onClick={()=>setLegalDocument('agreement')} className="font-bold text-[var(--otto-petrol-dark)] underline underline-offset-2">Пользовательское соглашение</button>
                      {' '}и подтверждаете, что ознакомились с{' '}
                      <button type="button" onClick={()=>setLegalDocument('privacy')} className="font-bold text-[var(--otto-petrol-dark)] underline underline-offset-2">Политикой обработки персональных данных</button>.
                    </p>
                  </div>
                )}

                <p className="mt-3 text-xs leading-5 text-[var(--otto-muted)]">{authenticatedSession ? 'Контакт подтверждён существующей сессией. После сохранения профиля откроется OTTO.' : contactType === 'email' ? 'Подтвердите email кодом из письма. После этого откроется главный экран OTTO.' : 'Telegram считается подтверждённым только после автоматической проверки внутри Telegram.'}</p>
                {!profileValid && contactType === 'email' && (name.trim() || contact.trim() || gender !== null) && <p className="mt-2 text-sm font-semibold text-[var(--otto-danger)]">Проверьте имя, пол и выбранный контакт.</p>}
                {!profileValid && contactType === 'telegram' && telegramVerified && (name.trim() || gender !== null) && <p className="mt-2 text-sm font-semibold text-[var(--otto-danger)]">Проверьте имя и пол.</p>}
                {otpError && <p className="mt-2 text-sm font-semibold text-[var(--otto-danger)]" role="alert">{otpError}</p>}
                {sendFailed && contactType === 'email' ? (
                  <div className="mt-4 space-y-2">
                    <button type="button" disabled={busy !== null || authenticatedSession} onClick={() => void requestOtp('register')} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--otto-petrol-dark)] px-5 font-[850] text-white disabled:opacity-45">Попробовать ещё раз</button>
                    <button type="button" disabled={busy !== null} onClick={() => { setSendFailed(false); setOtpError(null); emailInputRef.current?.focus(); }} className="min-h-11 w-full rounded-xl border border-[var(--otto-line)] bg-[var(--otto-surface)] px-4 text-sm font-bold text-[var(--otto-petrol-dark)] disabled:opacity-45">Изменить email</button>
                    <p className="px-1 text-xs leading-5 text-[var(--otto-muted)]">Подтвердите email, чтобы завершить регистрацию и использовать этот адрес для входа.</p>
                  </div>
                ) : contactType === 'email' || telegramVerified ? (
                  <button type="button" disabled={!canContinueProfile || busy !== null} onClick={continueProfile} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--otto-petrol-dark)] px-5 font-[850] text-white disabled:cursor-not-allowed disabled:opacity-35">
                    {busy === 'request' ? 'Отправляем код…' : contactType === 'email' && !emailVerified ? 'Получить код' : 'Продолжить'} <ArrowRight className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            )}

            {step === 'otp' && (
              <div className="animate-fade-in">
                <p className="text-xs font-[850] uppercase tracking-[.14em] text-[var(--otto-petrol-dark)]">Подтверждение email</p>
                <h2 className="mt-1 text-2xl font-bold leading-[1.08] text-[var(--otto-ink)]" style={serifFont}>Введите код</h2>
                <p className="mt-3 text-sm leading-6 text-[var(--otto-muted)]">Мы отправили 6-значный код на<br/><strong className="text-[var(--otto-ink)]">{maskEmail(normalizedEmail)}</strong></p>

                <div className="mt-5 grid grid-cols-6 gap-2" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(node) => { otpRefs.current[index] = node; }}
                      value={digit}
                      onChange={(event) => handleOtpChange(index, event.target.value)}
                      onKeyDown={(event) => handleOtpKeyDown(index, event)}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete={index === 0 ? 'one-time-code' : 'off'}
                      maxLength={1}
                      aria-label={`Цифра ${index + 1} из 6`}
                      className="aspect-square min-w-0 rounded-xl border border-[var(--otto-line-strong)] bg-[var(--otto-surface-strong)] text-center text-xl font-[850] text-[var(--otto-ink)] outline-none focus:border-[var(--otto-petrol)] focus:ring-2 focus:ring-[var(--otto-petrol)]/15"
                    />
                  ))}
                </div>

                {otpError && <p className="mt-3 text-sm font-semibold leading-5 text-[var(--otto-danger)]" role="alert">{otpError}</p>}
                {showDelayHint && <p className="mt-3 rounded-xl bg-[var(--otto-sand)]/45 px-3 py-2 text-sm leading-5 text-[var(--otto-muted)]">Письмо задерживается? Проверьте папку «Спам» или отправьте код ещё раз.</p>}

                <button type="button" disabled={otpValue.length !== 6 || busy !== null || !challengeId || otpNeedsNewCode} onClick={() => void verifyOtp()} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--otto-petrol-dark)] px-5 font-[850] text-white disabled:cursor-not-allowed disabled:opacity-35">
                  {busy === 'verify' ? 'Проверяем…' : 'Подтвердить email'} <CheckCircle2 className="h-5 w-5" />
                </button>

                <button type="button" disabled={resendSeconds > 0 || busy !== null} onClick={() => void requestOtp(authIntent)} className="mt-3 min-h-11 w-full rounded-xl border border-[var(--otto-line)] bg-[var(--otto-surface)] px-4 text-sm font-bold text-[var(--otto-petrol-dark)] disabled:cursor-not-allowed disabled:opacity-45">
                  {resendSeconds > 0 ? `Отправить код ещё раз через ${resendSeconds} сек.` : busy === 'request' ? 'Отправляем код…' : otpNeedsNewCode ? 'Получить новый код для безопасного входа' : 'Отправить код ещё раз'}
                </button>
                <button type="button" disabled={busy !== null} onClick={() => void changeEmail()} className="mt-2 min-h-11 w-full rounded-xl px-4 text-sm font-bold text-[var(--otto-muted)] disabled:opacity-45">Изменить email</button>
                <p className="mt-3 px-1 text-xs leading-5 text-[var(--otto-muted)]">{authIntent === 'login' ? 'После правильного кода откроется существующий профиль и сохранённый прогресс.' : 'Подтвердите email, чтобы завершить регистрацию и использовать этот адрес для входа.'}</p>
              </div>
            )}

            {step === 'mode' && (
              <div className="animate-fade-in">
                <p className="text-xs font-[850] uppercase tracking-[.14em] text-[var(--otto-petrol-dark)]">Как Отто будет помогать</p>
                <h2 className="mt-1 text-2xl font-bold leading-[1.08] text-[var(--otto-ink)]" style={serifFont}>Выберите режим обучения</h2>
                <div className="mt-5 space-y-3">
                  <ModeCard active={mode === 'guided'} title="Начинаю с нуля" description="Отто будет объяснять новые типы заданий и давать короткую подготовку перед тренировкой." onClick={() => setMode('guided')} />
                  <ModeCard active={mode === 'direct'} title="Я уже немного знаю немецкий" description="Сразу к тренировкам без дополнительных объяснений." onClick={() => setMode('direct')} />
                </div>
                {otpError && <p className="mt-4 text-sm font-semibold leading-5 text-[var(--otto-danger)]" role="alert">{otpError}</p>}
                {saveError && <p role="alert" className="mt-2 text-sm font-semibold leading-5 text-[var(--otto-danger)]">{saveError === 'not_authenticated' ? 'Сессия входа истекла. Безопасно войдите снова через кнопку входа, а не регистрацию.' : saveError === 'invalid_profile' ? 'Сервер не принял имя или настройки профиля. Проверьте заполнение и повторите.' : saveError === 'profile_response_invalid' ? 'Сервер не подтвердил профиль после записи. Попробуйте сохранить ещё раз; повторная регистрация не нужна.' : 'Сервер не смог сохранить профиль (' + saveError + '). Повторите сохранение позже, не регистрируясь заново.'}</p>}
                <button type="button" disabled={busy !== null} onClick={()=>void save()} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--otto-terracotta)] px-5 font-[850] text-white disabled:opacity-40"><CheckCircle2 className="h-5 w-5" />{busy==='legal'?'Сохраняем согласие…':busy==='profile'?'Сохраняем профиль…':initialProfile ? 'Сохранить профиль' : 'Начать заниматься'}</button>
              </div>
            )}
          </div>
        </section>
      </div>
      {legalDocument && <LegalDocumentsModal documentId={legalDocument} onClose={()=>setLegalDocument(null)}/>}
      {gmailAdviceOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/20 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) dismissGmailAdvice(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="gmail-advice-title" className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-[var(--otto-line)] bg-[var(--otto-surface)] p-5 shadow-[0_24px_70px_rgba(43,54,54,.18)] sm:p-6">
            <button type="button" onClick={dismissGmailAdvice} aria-label="Закрыть совет" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full text-[var(--otto-muted)] transition hover:bg-[var(--otto-bg-soft)]">
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-start gap-4 pr-8">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[var(--otto-petrol-soft)]">
                <OttoScene scene="home" className="absolute -bottom-5 left-1/2 h-28 w-auto max-w-none -translate-x-1/2" />
              </div>
              <div>
                <h2 id="gmail-advice-title" className="text-xl font-bold leading-tight text-[var(--otto-ink)]" style={serifFont}>Небольшой совет от OTTO 💌</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--otto-muted)]">Для более быстрой доставки кода рекомендуем Яндекс Почту или Mail.ru.</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--otto-muted)]">На Gmail письмо иногда может прийти с задержкой или попасть в «Спам».</p>
            <p className="mt-2 text-sm leading-6 text-[var(--otto-muted)]">Если удобно, можно указать другой адрес. Но Gmail тоже можно использовать.</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={chooseDifferentRegistrationEmail} className="min-h-11 rounded-xl border border-[var(--otto-line)] bg-[var(--otto-surface)] px-4 text-sm font-bold text-[var(--otto-petrol-dark)]">Указать другой email</button>
              <button type="button" onClick={continueRegistrationWithGmail} className="min-h-11 rounded-xl bg-[var(--otto-petrol-dark)] px-4 text-sm font-[850] text-white">Всё равно использовать Gmail</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function ModeCard({ active, title, description, onClick }: { active: boolean; title: string; description: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={cn('w-full rounded-2xl border p-4 text-left transition', active ? 'border-[var(--otto-petrol)] bg-[var(--otto-petrol-soft)] ring-2 ring-[var(--otto-petrol)]/10' : 'border-[var(--otto-line)] bg-[var(--otto-surface)]')}><span className="flex items-start gap-3"><span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border', active ? 'border-[var(--otto-petrol)] bg-[var(--otto-petrol)] text-white' : 'border-[var(--otto-line-strong)] bg-[var(--otto-surface)]')}>{active ? <CheckCircle2 className="h-4 w-4" /> : null}</span><span><strong className="block text-base text-[var(--otto-ink)]">{title}</strong><span className="mt-1 block text-sm leading-6 text-[var(--otto-muted)]">{description}</span></span></span></button>;
}
