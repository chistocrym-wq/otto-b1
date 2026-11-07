import { useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { ArrowLeft, CheckCircle2, Mail, Send } from 'lucide-react';
import { useAccess } from '@/hooks/useAccess';
import type { ContactType, Gender, UserProfile, UserProfileDraft } from '@/hooks/useUserProfile';
import { cn } from '@/lib/utils';
import { emailFromProfile } from '@/lib/profileContact';

interface Props {
  profile: UserProfile;
  onSave: (profile: UserProfileDraft) => void;
  onCancel: () => void;
}

type BusyState = 'request' | 'verify' | null;

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(value.trim()) && value.trim().length <= 254;
}
function validTelegram(value: string) {
  return /^@?[A-Za-z0-9_]{5,32}$/u.test(value.trim());
}
function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}
function normalizeTelegram(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}
function otpMessage(code?: string) {
  if (code === 'email_in_use') return 'Этот email уже привязан к другому аккаунту OTTO.';
  if (code === 'not_authenticated') return 'Сессия завершилась. Войдите в аккаунт снова.';
  if (code === 'invalid_code') return 'Код не подходит. Проверьте цифры и попробуйте ещё раз.';
  if (code === 'expired' || code === 'used') return 'Срок действия кода истёк. Отправьте новый код.';
  if (code === 'too_many_attempts') return 'Слишком много неверных попыток. Отправьте новый код.';
  return 'Не удалось проверить код. Попробуйте ещё раз.';
}

export function ProfileEditor({ profile, onSave, onCancel }: Props) {
  const { status } = useAccess();
  const [name, setName] = useState(profile.name);
  const [gender, setGender] = useState<Gender | undefined>(profile.gender);
  const [contactType, setContactType] = useState<ContactType>(profile.contactType);
  // Keep provider drafts separate: a Telegram ID must never become an email.
  const [emailDraft, setEmailDraft] = useState(() => emailFromProfile(profile));
  const [telegramDraft, setTelegramDraft] = useState(
    profile.contactType === 'telegram' ? profile.contact : '',
  );
  const contact = contactType === 'email' ? emailDraft : telegramDraft;
  const [verifiedEmail, setVerifiedEmail] = useState(
    profile.contactVerified ? emailFromProfile(profile) : '',
  );
  const [challengeId, setChallengeId] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(() => Array(6).fill(''));
  const [otpError, setOtpError] = useState<string | null>(null);
  const [busy, setBusy] = useState<BusyState>(null);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const normalizedEmail = normalizeEmail(emailDraft);
  const existingTelegramVerified = profile.contactType === 'telegram' && profile.contactVerified && contactType === 'telegram' && contact.trim() === profile.contact;
  const telegramVerified = existingTelegramVerified || (contactType === 'telegram' && status.authenticated && Boolean(status.telegramUserId));
  const emailVerified = contactType === 'email' && Boolean(verifiedEmail) && verifiedEmail === normalizedEmail;
  const contactValid = useMemo(() => contactType === 'email' ? validEmail(contact) : telegramVerified || validTelegram(contact), [contact, contactType, telegramVerified]);
  const baseValid = name.trim().length >= 2 && contactValid;
  const otpValue = otpDigits.join('');
  const needsEmailVerification = contactType === 'email' && !emailVerified;
  const canSave = baseValid && !needsEmailVerification;

  const requestOtp = async () => {
    if (!baseValid || contactType !== 'email' || busy) return;
    setBusy('request'); setOtpError(null);
    try {
      const response = await fetch('/api/profile-email', {
        method: 'POST',
        credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'request', email: normalizedEmail }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.challengeId !== 'string') {
        setOtpError(response.status === 429 && Number(data.retryAfter) > 0 ? `Код можно отправить повторно через ${Number(data.retryAfter)} сек.` : 'Не удалось отправить код.');
        return;
      }
      setChallengeId(data.challengeId);
      setOtpDigits(Array(6).fill(''));
      window.setTimeout(() => otpRefs.current[0]?.focus(), 0);
    } catch {
      setOtpError('Не удалось отправить код.');
    } finally {
      setBusy(null);
    }
  };

  const verifyOtp = async () => {
    if (busy || otpValue.length !== 6 || !challengeId) return;
    setBusy('verify'); setOtpError(null);
    try {
      const response = await fetch('/api/profile-email', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          challengeId,
          email: normalizedEmail,
          code: otpValue,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.verified !== true) { setOtpError(otpMessage(data.code)); return; }
      setVerifiedEmail(normalizedEmail);
      setChallengeId('');
      setOtpDigits(Array(6).fill(''));
    } catch {
      setOtpError('Не удалось проверить код. Попробуйте ещё раз.');
    } finally {
      setBusy(null);
    }
  };

  const save = () => {
    if (!canSave || (contactType === 'email' && !validEmail(normalizedEmail))) return;
    const verified = contactType === 'email' ? emailVerified : telegramVerified;
    const contactValue = contactType === 'email' ? normalizedEmail : existingTelegramVerified ? profile.contact : telegramVerified ? String(status.telegramUserId) : normalizeTelegram(contact);
    onSave({
      name: name.trim(),
      contactType,
      contact: contactValue,
      contactVerified: verified,
      authStatus: verified ? 'verified' : 'guest',
      gender,
      learningMode: profile.learningMode,
    });
  };

  const changeContact = (value: string) => {
    if (contactType === 'email') setEmailDraft(value);
    else setTelegramDraft(value);
    setOtpError(null); setChallengeId(''); setOtpDigits(Array(6).fill(''));
  };

  const selectContactType = (next: ContactType) => {
    setContactType(next);
    setOtpError(null);
    setChallengeId('');
    setOtpDigits(Array(6).fill(''));
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/gu, '').slice(-1);
    setOtpDigits(current => { const next=[...current]; next[index]=digit; return next; });
    if (digit && index < 5) otpRefs.current[index+1]?.focus();
  };
  const handleOtpKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Backspace' || otpDigits[index] || index <= 0) return;
    setOtpDigits(current => { const next=[...current]; next[index-1]=''; return next; });
    otpRefs.current[index-1]?.focus();
  };
  const handleOtpPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const digits=event.clipboardData.getData('text').replace(/\D/gu,'').slice(0,6);
    if(!digits)return; event.preventDefault();
    const next=Array(6).fill(''); digits.split('').forEach((digit,index)=>{next[index]=digit;}); setOtpDigits(next);
  };

  return <main className="otto-responsive-profile h-[100dvh] overflow-x-hidden overflow-y-auto overscroll-contain bg-[var(--otto-bg)] px-4 py-5 text-[var(--otto-ink)] sm:px-6 sm:py-8">
    <div className="mx-auto w-full max-w-xl pb-[max(1rem,env(safe-area-inset-bottom))]">
      <button type="button" onClick={onCancel} className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--otto-line)] bg-white px-4 text-sm font-bold"><ArrowLeft className="h-4 w-4"/>Назад</button>
      <section className="rounded-[28px] border border-[var(--otto-line)] bg-white p-5 shadow-[0_18px_55px_rgba(9,47,104,.10)] sm:p-7">
        <p className="text-xs font-black uppercase tracking-[.14em] text-[var(--otto-petrol)]">Профиль</p>
        <h1 className="mt-1 text-2xl font-black">Редактирование профиля</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--otto-muted)]">Измените только нужные данные. Режим обучения настраивается отдельно.</p>

        <label className="mt-5 block text-sm font-bold">Имя<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" maxLength={60} className="mt-2 min-h-12 w-full rounded-xl border border-[var(--otto-line-strong)] px-4 text-base outline-none focus:border-[var(--otto-petrol)]"/></label>

        <fieldset className="mt-5"><legend className="text-sm font-bold">Ваш пол</legend><div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={()=>setGender('female')} aria-pressed={gender==='female'} className={cn('min-h-12 rounded-xl border px-3 font-bold',gender==='female'?'border-[var(--otto-petrol)] bg-[var(--otto-petrol-soft)] text-[var(--otto-petrol-dark)]':'border-[var(--otto-line)] text-[var(--otto-muted)]')}>Женский</button>
          <button type="button" onClick={()=>setGender('male')} aria-pressed={gender==='male'} className={cn('min-h-12 rounded-xl border px-3 font-bold',gender==='male'?'border-[var(--otto-petrol)] bg-[var(--otto-petrol-soft)] text-[var(--otto-petrol-dark)]':'border-[var(--otto-line)] text-[var(--otto-muted)]')}>Мужской</button>
        </div></fieldset>

        <fieldset className="mt-5"><legend className="text-sm font-bold">Контакт</legend><div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={()=>selectContactType('email')} disabled={busy!==null} aria-pressed={contactType==='email'} className={cn('min-h-12 rounded-xl border px-3 font-bold',contactType==='email'?'border-[var(--otto-petrol)] bg-[var(--otto-petrol-soft)] text-[var(--otto-petrol-dark)]':'border-[var(--otto-line)] text-[var(--otto-muted)]')}><Mail className="mr-2 inline h-4 w-4"/>Email</button>
          <button type="button" onClick={()=>selectContactType('telegram')} disabled={busy!==null} aria-pressed={contactType==='telegram'} className={cn('min-h-12 rounded-xl border px-3 font-bold',contactType==='telegram'?'border-[var(--otto-petrol)] bg-[var(--otto-petrol-soft)] text-[var(--otto-petrol-dark)]':'border-[var(--otto-line)] text-[var(--otto-muted)]')}><Send className="mr-2 inline h-4 w-4"/>Telegram</button>
        </div></fieldset>

        {contactType==='email'
          ? <label className="mt-4 block text-sm font-bold">Email<input value={emailDraft} onChange={e=>changeContact(e.target.value)} disabled={busy!==null} inputMode="email" autoComplete="email" placeholder="name@example.com" className="mt-2 min-h-12 w-full rounded-xl border border-[var(--otto-line-strong)] px-4 text-base outline-none focus:border-[var(--otto-petrol)]"/></label>
          : telegramVerified
            ? <div className="mt-4 rounded-xl bg-[var(--otto-petrol-soft)] p-3 text-sm text-[var(--otto-petrol-dark)]"><CheckCircle2 className="mr-2 inline h-4 w-4"/>Telegram подтверждён</div>
            : <label className="mt-4 block text-sm font-bold">Telegram username<input value={contact.replace(/^@/u,'')} onChange={e=>changeContact(e.target.value)} placeholder="username" className="mt-2 min-h-12 w-full rounded-xl border border-[var(--otto-line-strong)] px-4 text-base outline-none focus:border-[var(--otto-petrol)]"/></label>}

        {needsEmailVerification && baseValid && !challengeId && <button type="button" onClick={()=>void requestOtp()} disabled={busy!==null} className="mt-4 min-h-12 w-full rounded-xl border border-[var(--otto-petrol)] px-4 font-bold text-[var(--otto-petrol-dark)] disabled:opacity-45">{busy==='request'?'Отправляем код…':'Подтвердить новый email'}</button>}

        {contactType==='email' && challengeId && !emailVerified && <div className="mt-4 rounded-2xl border border-[var(--otto-line)] p-4">
          <p className="text-sm font-bold">Введите код из письма</p>
          <div className="mt-3 grid grid-cols-6 gap-2" onPaste={handleOtpPaste}>{otpDigits.map((digit,index)=><input key={index} ref={node=>{otpRefs.current[index]=node}} value={digit} onChange={e=>handleOtpChange(index,e.target.value)} onKeyDown={e=>handleOtpKeyDown(index,e)} inputMode="numeric" pattern="[0-9]*" maxLength={1} className="aspect-square min-w-0 rounded-xl border border-[var(--otto-line-strong)] text-center text-xl font-black outline-none focus:border-[var(--otto-petrol)]"/>)}</div>
          <button type="button" onClick={()=>void verifyOtp()} disabled={otpValue.length!==6||busy!==null} className="mt-3 min-h-11 w-full rounded-xl bg-[var(--otto-petrol-dark)] px-4 font-bold text-white disabled:opacity-45">{busy==='verify'?'Проверяем…':'Проверить код'}</button>
        </div>}
        {otpError&&<p className="mt-3 text-sm font-semibold text-[var(--otto-danger)]" role="alert">{otpError}</p>}

        <div className="sticky bottom-0 z-10 -mx-5 mt-6 border-t border-[var(--otto-line)] bg-white/95 px-5 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:-mx-7 sm:px-7">
          <button type="button" onClick={save} disabled={!canSave||busy!==null} className="min-h-12 w-full rounded-xl bg-[var(--otto-petrol-dark)] px-5 font-black text-white disabled:opacity-40">Сохранить</button>
        </div>
      </section>
    </div>
  </main>;
}
