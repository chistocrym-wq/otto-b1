import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  HelpCircle,
  MessageCircle,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  closeSupportTicket,
  createSupportTicket,
  getSupportSummary,
  getSupportTicket,
  listSupportTickets,
  markSupportTicketRead,
  replySupportTicket,
  SupportRequestError,
  type SupportSummary,
  type SupportTicketDetail,
  type SupportTicketListItem,
} from '@/lib/supportClient';

interface Props {
  onBack: () => void;
  onSummaryChange?: (summary: SupportSummary) => void;
  initialTicketId?: string | null;
}

const MOSCOW_TIME = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Moscow',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : `${MOSCOW_TIME.format(date)} МСК`;
}

function errorText(error: unknown) {
  if (!(error instanceof SupportRequestError)) return 'Поддержка временно недоступна. Попробуйте ещё раз.';
  if (error.code === 'support_daily_limit') return 'Сегодня уже создано 5 обращений. Новое обращение можно создать завтра.';
  if (error.code === 'support_message_rate_limit') return 'Сообщения отправляются слишком быстро. Подождите пару секунд.';
  if (error.code === 'support_ticket_closed') return 'Этот тикет уже закрыт.';
  if (error.code === 'not_authenticated') return 'Чтобы обратиться в поддержку, сначала зарегистрируйтесь в OTTO.';
  return 'Не удалось выполнить действие. Попробуйте ещё раз.';
}

export function SupportPage({ onBack, onSummaryChange, initialTicketId = null }: Props) {
  const [tickets, setTickets] = useState<SupportTicketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createText, setCreateText] = useState('');
  const [detail, setDetail] = useState<SupportTicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copiedTech, setCopiedTech] = useState(false);

  const technicalContext = useMemo(() => {
    const pageUrl = typeof window === 'undefined'
      ? ''
      : `${window.location.origin}${window.location.pathname}`;
    const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent;
    return { pageUrl, userAgent };
  }, []);

  const technicalInfo = useMemo(
    () => `OTTO A1\nСтраница: ${technicalContext.pageUrl}\nУстройство: ${technicalContext.userAgent}`,
    [technicalContext],
  );

  const openTickets = useMemo(() => tickets.filter((ticket) => ticket.status === 'open'), [tickets]);
  const closedTickets = useMemo(() => tickets.filter((ticket) => ticket.status === 'closed'), [tickets]);

  const copyTechnicalInfo = async () => {
    try {
      await navigator.clipboard.writeText(technicalInfo);
      setCopiedTech(true);
      window.setTimeout(() => setCopiedTech(false), 2200);
    } catch {
      setCopiedTech(false);
    }
  };

  const refreshUnread = useCallback(async () => {
    try {
      const summary = await getSupportSummary();
      onSummaryChange?.(summary);
    } catch {
      // The support page remains usable even if the badge refresh fails.
    }
  }, [onSummaryChange]);

  const loadTickets = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const next = await listSupportTickets();
      setTickets(next);
      setError('');
    } catch (err) {
      if (!quiet) setError(errorText(err));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const openTicket = useCallback(async (ticketId: string) => {
    setDetailLoading(true);
    setError('');
    try {
      const next = await getSupportTicket(ticketId);
      setDetail(next);
      setReply('');
      await markSupportTicketRead(ticketId).catch(() => undefined);
      await Promise.all([refreshUnread(), loadTickets(true)]);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setDetailLoading(false);
    }
  }, [loadTickets, refreshUnread]);

  useEffect(() => {
    if (initialTicketId) void openTicket(initialTicketId);
  }, [initialTicketId, openTicket]);

  const refreshDetail = async () => {
    if (!detail) return;
    const next = await getSupportTicket(detail.ticket.id);
    setDetail(next);
  };

  const submitTicket = async (event: FormEvent) => {
    event.preventDefault();
    const message = createText.trim();
    if (!message || busy) return;
    setBusy(true);
    setError('');
    try {
      const data = await createSupportTicket(message);
      const ticket = data.ticket as { ticket_number?: number; ticket_id?: string } | undefined;
      setCreateText('');
      setCreating(false);
      setNotice(ticket?.ticket_number ? `Обращение #${ticket.ticket_number} создано.` : 'Обращение создано.');
      await loadTickets(true);
      if (ticket?.ticket_id) await openTicket(ticket.ticket_id);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!detail || !reply.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await replySupportTicket(detail.ticket.id, reply.trim());
      setReply('');
      await Promise.all([refreshDetail(), loadTickets(true), refreshUnread()]);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const solveProblem = async () => {
    if (!detail || busy || detail.ticket.status === 'closed') return;
    if (!window.confirm(`Закрыть обращение #${detail.ticket.ticket_no}? После этого продолжить переписку в нём будет нельзя.`)) return;
    setBusy(true);
    setError('');
    try {
      await closeSupportTicket(detail.ticket.id);
      await Promise.all([refreshDetail(), loadTickets(true), refreshUnread()]);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const ticketButton = (ticket: SupportTicketListItem) => (
    <button
      key={ticket.ticket_id}
      type="button"
      onClick={() => void openTicket(ticket.ticket_id)}
      className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-sky-200"
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${ticket.user_unread ? 'bg-red-50 text-red-600' : 'bg-sky-50 text-sky-700'}`}><MessageCircle className="h-5 w-5"/></span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <b className="text-slate-950">Обращение #{ticket.ticket_no}</b>
          {ticket.user_unread && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-black text-red-700">Новый ответ</span>}
          {ticket.status === 'closed' && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">Закрыто</span>}
        </span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">Последнее сообщение: {formatTime(ticket.last_message_at)}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400"/>
    </button>
  );

  return <div className="otto-support-page animate-fade-in">
    <div className="otto-sticky-head">
      <button type="button" onClick={onBack} aria-label="Назад" className="otto-back-button"><ArrowLeft /></button>
      <div><p className="otto-kicker">Поддержка OTTO</p><h1 className="text-2xl font-black text-slate-950">Помощь и обращения</h1></div>
    </div>

    <section className="otto-support-intro">
      <span className="otto-support-badge"><HelpCircle /></span>
      <div><h2>Если что-то работает не так</h2><p>Сначала вернитесь на главный экран и откройте нужный раздел заново. Ваш учебный прогресс при этом не сбрасывается.</p></div>
    </section>

    <div className="otto-support-grid">
      <section className="otto-support-card"><RefreshCw /><div><strong>Задание не открылось</strong><p>Закройте карточку или раздел и откройте его снова. Если проблема повторяется, перезапустите приложение.</p></div></section>
      <section className="otto-support-card"><ShieldCheck /><div><strong>Нет звука или микрофона</strong><p>Проверьте разрешения Telegram или браузера для звука и микрофона. OTTO не включает их без разрешения устройства.</p></div></section>
      <section className="otto-support-card"><Clipboard /><div><strong>Нужно сообщить об ошибке</strong><p>Скопируйте техническую информацию ниже — она поможет точно определить страницу и устройство, где возникла проблема.</p></div></section>
    </div>

    <button type="button" className="otto-support-copy" onClick={() => void copyTechnicalInfo()}>
      {copiedTech ? <CheckCircle2 /> : <Clipboard />}
      <span>{copiedTech ? 'Техническая информация скопирована' : 'Скопировать техническую информацию'}</span>
    </button>

    {error && <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700">{error}</div>}
    {notice && <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-800">{notice}</div>}

    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" onClick={() => { setCreating(true); setError(''); }} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#28ADF7] via-[#1289E8] to-[#076CD4] px-4 font-black text-white"><Plus className="h-5 w-5"/>Новое обращение</button>
      <button type="button" onClick={() => void loadTickets()} disabled={loading} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 font-bold text-slate-700"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>Обновить</button>
    </div>

    <section className="mt-5">
      <div className="mb-3 flex items-center justify-between gap-3"><div><p className="otto-kicker">Активные</p><h2 className="text-xl font-black text-slate-950">Мои обращения</h2></div><span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">{openTickets.length}</span></div>
      <div className="grid gap-2">{loading ? <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Загружаем обращения…</div> : openTickets.length ? openTickets.map(ticketButton) : <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-500">Открытых обращений пока нет.</div>}</div>
    </section>

    {closedTickets.length > 0 && <section className="mt-6"><div className="mb-3"><p className="otto-kicker">История</p><h2 className="text-xl font-black text-slate-950">Закрытые обращения</h2></div><div className="grid gap-2">{closedTickets.map(ticketButton)}</div></section>}

    {creating && typeof document !== 'undefined' && createPortal(<div className="otto-skin otto-support-modal-layer fixed inset-0 flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setCreating(false); }}>
      <form onSubmit={submitTicket} className="otto-support-create-sheet w-full max-w-2xl rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3"><div><p className="otto-kicker">Новое обращение</p><h2 className="text-2xl font-black text-slate-950">Опишите проблему</h2></div><button type="button" onClick={() => setCreating(false)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200"><X className="h-5 w-5"/></button></div>
        <p className="mt-2 text-sm leading-6 text-slate-500">Можно создать до 5 новых обращений в сутки. Ответы внутри существующего тикета в этот лимит не входят.</p>
        <textarea autoFocus value={createText} onChange={(event) => setCreateText(event.target.value)} maxLength={8000} rows={7} placeholder="Что произошло? Что вы ожидали увидеть?" className="mt-4 w-full resize-y rounded-2xl border border-slate-300 p-3 text-base leading-6 outline-none focus:border-sky-500"/>
        <div className="mt-2 text-right text-xs font-semibold text-slate-400">{createText.length}/8000</div>
        <button type="submit" disabled={busy || !createText.trim()} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 font-black text-white disabled:opacity-50"><Send className="h-4 w-4"/>{busy ? 'Отправляем…' : 'Отправить обращение'}</button>
      </form>
    </div>, document.body)}

    {(detail || detailLoading) && typeof document !== 'undefined' && createPortal(<div className="otto-skin otto-support-modal-layer fixed inset-0 flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setDetail(null); }}>
      <div className="otto-support-dialog flex w-full max-w-2xl flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        {detailLoading && !detail ? <div className="p-8 text-center text-slate-500">Открываем обращение…</div> : detail && <>
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4 sm:p-5">
            <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-black text-slate-950">Обращение #{detail.ticket.ticket_no}</h2>{detail.ticket.status === 'closed' && <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">Закрыто</span>}</div><p className="mt-1 text-sm text-slate-500">Создано {formatTime(detail.ticket.created_at)}</p></div>
            <button type="button" onClick={() => setDetail(null)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200"><X className="h-5 w-5"/></button>
          </div>
          <div className="otto-support-message-list flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4 sm:p-5">
            {detail.messages.map((message) => <div key={message.id} className={`flex ${message.author_type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`otto-support-message ${message.author_type === 'user' ? 'is-user' : 'is-support'} max-w-[88%] rounded-2xl px-4 py-3`}>
                <p className="otto-support-message-body whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p>
                <p className="otto-support-message-meta mt-2 text-xs">{message.author_type === 'user' ? 'Вы' : 'Поддержка OTTO'} · {formatTime(message.created_at)}</p>
              </div>
            </div>)}
          </div>
          <div className="otto-support-dialog-footer border-t border-slate-200 p-4 sm:p-5">
            {detail.ticket.status === 'open' ? <>
              <textarea value={reply} onChange={(event) => setReply(event.target.value)} maxLength={8000} rows={3} placeholder="Напишите сообщение…" className="w-full resize-y rounded-2xl border border-slate-300 p-3 text-sm leading-6 outline-none focus:border-sky-500"/>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => void sendReply()} disabled={busy || !reply.trim()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 font-black text-white disabled:opacity-50"><Send className="h-4 w-4"/>Отправить</button>
                <button type="button" onClick={() => void solveProblem()} disabled={busy} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 font-black text-emerald-800 disabled:opacity-50"><Check className="h-4 w-4"/>Проблема решена</button>
              </div>
            </> : <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold leading-6 text-slate-600">Проблема отмечена как решённая. Этот тикет сохранён в истории и доступен только для чтения.</div>}
          </div>
        </>}
      </div>
    </div>, document.body)}
  </div>;
}
