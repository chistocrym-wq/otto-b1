import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Clipboard, LogOut, MessageCircle, RefreshCw, Send, Users, X } from 'lucide-react';

interface AdminStats {
  total_users: number;
  registered_today: number;
  open_tickets: number;
  waiting_support: number;
}

interface AdminTicketRow {
  ticket_id: string;
  ticket_no: number;
  user_id: string;
  user_name: string;
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  last_message_at: string;
  last_message_author: 'user' | 'admin';
  admin_unread: boolean;
  closed_at: string | null;
  total_count: number;
}

interface AdminMessage {
  id: string;
  author_type: 'user' | 'admin';
  body: string;
  admin_login: string | null;
  created_at: string;
}

interface AdminUserRow {
  user_id: string;
  user_name: string;
  email: string | null;
  telegram_id: string | null;
  registered_at: string;
  training_seconds: number;
  last_session_at: string | null;
  total_count: number;
}

interface AdminStateDiagnosticRow {
  state_key:string;
  state_value:string|null;
  updated_at:string|null;
}

interface AdminTicketDetail {
  ticket: {
    id: string;
    ticket_no: number;
    user_id: string;
    user_name: string;
    status: 'open' | 'closed';
    created_at: string;
    updated_at: string;
    last_message_at: string;
    last_message_author: 'user' | 'admin';
    closed_at: string | null;
    closed_by: 'user' | 'admin' | null;
    closed_by_admin: string | null;
    page_url: string;
    user_agent: string;
  };
  messages: AdminMessage[];
}

type Filter = 'waiting' | 'open' | 'closed';
type AdminSection = 'tickets' | 'users';
const PAGE_SIZE = 50;
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

function formatTrainingTime(seconds: number) {
  const totalMinutes = Math.max(0, Math.floor((Number(seconds) || 0) / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} мин`;
  if (minutes === 0) return `${hours} ч`;
  return `${hours} ч ${minutes} мин`;
}

async function adminFetch(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set('content-type', 'application/json');
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(typeof data.code === 'string' ? data.code : 'admin_request_failed');
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return data as Record<string, unknown>;
}

export function AdminApp() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [adminLogin, setAdminLogin] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [tickets, setTickets] = useState<AdminTicketRow[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [section, setSection] = useState<AdminSection>('tickets');
  const [filter, setFilter] = useState<Filter>('waiting');
  const [offset, setOffset] = useState(0);
  const [userOffset, setUserOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<AdminTicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const [stateDiagnosticUserId, setStateDiagnosticUserId] = useState('');
  const [stateDiagnosticRows, setStateDiagnosticRows] = useState<AdminStateDiagnosticRow[]>([]);
  const [stateDiagnosticLoading, setStateDiagnosticLoading] = useState(false);
  const [telegramRecipient, setTelegramRecipient] = useState<AdminUserRow | null>(null);
  const [telegramMessage, setTelegramMessage] = useState('');
  const [telegramBusy, setTelegramBusy] = useState(false);
  const [telegramLastSent, setTelegramLastSent] = useState<string | null>(null);
  const [telegramStatusLoading, setTelegramStatusLoading] = useState(false);
  const [telegramError, setTelegramError] = useState('');


  const totalCount = tickets.length ? Number(tickets[0].total_count) || 0 : 0;
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const usersTotalCount = users.length ? Number(users[0].total_count) || 0 : 0;
  const userPage = Math.floor(userOffset / PAGE_SIZE) + 1;
  const userPageCount = Math.max(1, Math.ceil(usersTotalCount / PAGE_SIZE));

  useEffect(() => {
    void (async () => {
      try {
        const data = await adminFetch('/api/admin-auth');
        setAuthenticated(data.authenticated === true);
        setAdminLogin(typeof data.login === 'string' ? data.login : '');
      } catch {
        setAuthenticated(false);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const loadDashboard = useCallback(async (quiet = false) => {
    if (!authenticated) return;
    if (!quiet) setLoading(true);
    try {
      const [statsData, listData, usersData] = await Promise.all([
        adminFetch('/api/admin-support?view=stats'),
        adminFetch(`/api/admin-support?view=list&filter=${filter}&limit=${PAGE_SIZE}&offset=${offset}`),
        adminFetch(`/api/admin-support?view=users&limit=${PAGE_SIZE}&offset=${userOffset}`),
      ]);
      const rawStats = statsData.stats as Partial<AdminStats> | undefined;
      setStats({
        total_users: Number(rawStats?.total_users) || 0,
        registered_today: Number(rawStats?.registered_today) || 0,
        open_tickets: Number(rawStats?.open_tickets) || 0,
        waiting_support: Number(rawStats?.waiting_support) || 0,
      });
      const rawTickets = Array.isArray(listData.tickets) ? listData.tickets : [];
      setTickets(rawTickets.map((row) => {
        const item = row as Partial<AdminTicketRow>;
        return {
          ticket_id: String(item.ticket_id || ''),
          ticket_no: Number(item.ticket_no) || 0,
          user_id: String(item.user_id || ''),
          user_name: String(item.user_name || 'Без имени'),
          status: item.status === 'closed' ? 'closed' : 'open',
          created_at: String(item.created_at || ''),
          updated_at: String(item.updated_at || ''),
          last_message_at: String(item.last_message_at || ''),
          last_message_author: item.last_message_author === 'admin' ? 'admin' : 'user',
          admin_unread: item.admin_unread === true,
          closed_at: item.closed_at ? String(item.closed_at) : null,
          total_count: Number(item.total_count) || 0,
        };
      }));
      const rawUsers = Array.isArray(usersData.users) ? usersData.users : [];
      setUsers(rawUsers.map((row) => {
        const item = row as Partial<AdminUserRow>;
        return {
          user_id: String(item.user_id || ''),
          user_name: String(item.user_name || 'Без имени'),
          email: item.email ? String(item.email) : null,
          telegram_id: item.telegram_id ? String(item.telegram_id) : null,
          registered_at: String(item.registered_at || ''),
          training_seconds: Number(item.training_seconds) || 0,
          last_session_at: item.last_session_at ? String(item.last_session_at) : null,
          total_count: Number(item.total_count) || 0,
        };
      }));
    } catch (error) {
      if ((error as Error & { status?: number }).status === 401) {
        setAuthenticated(false);
      } else if (!quiet) {
        setNotice('Не удалось обновить данные. Попробуйте ещё раз.');
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [authenticated, filter, offset, userOffset]);

  useEffect(() => {
    if (!authenticated) return;
    void loadDashboard();
    const timer = window.setInterval(() => void loadDashboard(true), 30000);
    return () => window.clearInterval(timer);
  }, [authenticated, loadDashboard]);

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoginBusy(true);
    setLoginError('');
    try {
      const data = await adminFetch('/api/admin-auth', {
        method: 'POST',
        body: JSON.stringify({ login, password }),
      });
      setAuthenticated(data.authenticated === true);
      setAdminLogin(typeof data.login === 'string' ? data.login : login.trim());
      setPassword('');
    } catch (error) {
      const code = (error as Error).message;
      setLoginError(code === 'admin_login_rate_limited'
        ? 'Слишком много попыток входа. Попробуйте позже.'
        : 'Неверный логин или пароль.');
    } finally {
      setLoginBusy(false);
    }
  };

  const logout = async () => {
    await fetch('/api/admin-auth', { method: 'DELETE', credentials: 'same-origin' }).catch(() => undefined);
    setAuthenticated(false);
    setAdminLogin('');
    setDetail(null);
  };

  const openTicket = async (ticketId: string) => {
    setDetailLoading(true);
    setNotice('');
    try {
      const data = await adminFetch(`/api/admin-support?view=ticket&ticketId=${encodeURIComponent(ticketId)}`);
      const next = { ticket: data.ticket, messages: data.messages } as AdminTicketDetail;
      setDetail(next);
      setReply('');
      await adminFetch('/api/admin-support', {
        method: 'POST',
        body: JSON.stringify({ action: 'read', ticketId }),
      }).catch(() => undefined);
      void loadDashboard(true);
    } catch {
      setNotice('Не удалось открыть тикет.');
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async () => {
    if (!detail) return;
    const data = await adminFetch(`/api/admin-support?view=ticket&ticketId=${encodeURIComponent(detail.ticket.id)}`);
    setDetail({ ticket: data.ticket, messages: data.messages } as AdminTicketDetail);
  };

  const sendReply = async () => {
    if (!detail || !reply.trim() || actionBusy) return;
    setActionBusy(true);
    try {
      await adminFetch('/api/admin-support', {
        method: 'POST',
        body: JSON.stringify({ action: 'reply', ticketId: detail.ticket.id, message: reply.trim() }),
      });
      setReply('');
      await Promise.all([refreshDetail(), loadDashboard(true)]);
    } catch (error) {
      setNotice((error as Error).message === 'support_ticket_closed' ? 'Тикет уже закрыт.' : 'Не удалось отправить ответ.');
    } finally {
      setActionBusy(false);
    }
  };

  const closeTicket = async () => {
    if (!detail || actionBusy || detail.ticket.status === 'closed') return;
    if (!window.confirm(`Закрыть тикет #${detail.ticket.ticket_no}? После закрытия его нельзя открыть заново.`)) return;
    setActionBusy(true);
    try {
      await adminFetch('/api/admin-support', {
        method: 'POST',
        body: JSON.stringify({ action: 'close', ticketId: detail.ticket.id }),
      });
      await Promise.all([refreshDetail(), loadDashboard(true)]);
    } catch {
      setNotice('Не удалось закрыть тикет.');
    } finally {
      setActionBusy(false);
    }
  };

  const openTelegramMessage = async (user: AdminUserRow) => {
    if (!user.telegram_id) return;
    setTelegramRecipient(user);
    setTelegramMessage('');
    setTelegramLastSent(null);
    setTelegramError('');
    setTelegramStatusLoading(true);
    try {
      const status = await adminFetch(`/api/admin-telegram-message?userId=${encodeURIComponent(user.user_id)}`);
      setTelegramLastSent(typeof status.lastSentAt === 'string' ? status.lastSentAt : null);
    } catch {
      setTelegramError('Не удалось получить историю отправки.');
    } finally {
      setTelegramStatusLoading(false);
    }
  };

  const sendTelegramMessage = async () => {
    if (!telegramRecipient || !telegramMessage.trim() || telegramBusy) return;
    setTelegramBusy(true);
    setTelegramError('');
    try {
      const result = await adminFetch('/api/admin-telegram-message', {
        method: 'POST',
        body: JSON.stringify({ userId: telegramRecipient.user_id, message: telegramMessage.trim() }),
      });
      setTelegramLastSent(typeof result.lastSentAt === 'string' ? result.lastSentAt : new Date().toISOString());
      setTelegramMessage('');
      setNotice('Telegram принял сообщение. Прочтение пользователем не подтверждается.');
    } catch (error) {
      const code = (error as Error).message;
      setTelegramError(code === 'telegram_not_linked' ? 'У пользователя нет подтверждённого Telegram ID.'
        : code === 'send_cooldown' ? 'Повторная отправка доступна через минуту.'
        : code === 'invalid_origin' ? 'Запрос отклонён проверкой безопасности.'
        : code === 'not_authenticated' ? 'Сессия администратора истекла. Войдите заново.'
        : 'Telegram не принял сообщение. Возможно, пользователь ещё не запустил бота или заблокировал его.');
    } finally {
      setTelegramBusy(false);
    }
  };

  const copyUserId = async (userId: string) => {
    try {
      await navigator.clipboard.writeText(userId);
      setCopiedId(userId);
      window.setTimeout(() => setCopiedId((current) => current === userId ? '' : current), 1800);
    } catch {
      setNotice('Не удалось скопировать ID пользователя.');
    }
  };

  const previewDiagnosticsAvailable = /^deploy-preview-\d+--otto-a1\.netlify\.app$/i.test(window.location.hostname);

  const openStateDiagnostic = async (userId:string) => {
    if (!previewDiagnosticsAvailable) return;
    setStateDiagnosticUserId(userId);
    setStateDiagnosticRows([]);
    setStateDiagnosticLoading(true);
    try {
      const data = await adminFetch(`/api/admin-state-diagnostic?userId=${encodeURIComponent(userId)}`);
      const rows = Array.isArray(data.state) ? data.state : [];
      setStateDiagnosticRows(rows.map((row) => {
        const item = row as Partial<AdminStateDiagnosticRow>;
        return {
          state_key:String(item.state_key||''),
          state_value:typeof item.state_value==='string'?item.state_value:null,
          updated_at:item.updated_at?String(item.updated_at):null,
        };
      }));
    } catch {
      setNotice('Не удалось загрузить диагностическое состояние пользователя.');
      setStateDiagnosticUserId('');
    } finally {
      setStateDiagnosticLoading(false);
    }
  };

  const statusLabel = useCallback((ticket: AdminTicketRow) => {
    if (ticket.status === 'closed') return 'Закрыт';
    return ticket.last_message_author === 'user' ? 'Ждёт поддержки' : 'Ждёт пользователя';
  }, []);

  const cards = useMemo(() => [
    { label: 'Всего пользователей', value: stats?.total_users ?? '—', Icon: Users },
    { label: 'Зарегистрировались сегодня', value: stats?.registered_today ?? '—', Icon: Users },
    { label: 'Открытых тикетов', value: stats?.open_tickets ?? '—', Icon: MessageCircle },
    { label: 'Ждут ответа поддержки', value: stats?.waiting_support ?? '—', Icon: MessageCircle },
  ], [stats]);

  if (checking) {
    return <div className="min-h-screen bg-slate-50 grid place-items-center text-slate-600">Проверяем сессию…</div>;
  }

  if (!authenticated) {
    return <div className="min-h-screen bg-slate-100 px-4 py-10 grid place-items-center">
      <form onSubmit={submitLogin} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl border border-slate-200">
        <p className="text-xs font-black uppercase tracking-[.18em] text-sky-700">OTTO Support</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Вход в админ-панель</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Введите административный логин и пароль.</p>
        <label className="mt-6 block text-sm font-bold text-slate-700">Логин<input autoComplete="username" value={login} onChange={(e) => setLogin(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-base" required /></label>
        <label className="mt-4 block text-sm font-bold text-slate-700">Пароль<input autoComplete="current-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-3 text-base" required /></label>
        {loginError && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{loginError}</p>}
        <button disabled={loginBusy} className="mt-5 min-h-12 w-full rounded-xl bg-slate-950 px-4 font-black text-white disabled:opacity-50">{loginBusy ? 'Входим…' : 'Войти'}</button>
      </form>
    </div>;
  }

  return <div className="min-h-screen bg-slate-100 text-slate-900">
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <div><p className="text-xs font-black uppercase tracking-[.18em] text-sky-700">OTTO Support</p><h1 className="text-xl font-black">Админ-панель</h1></div>
        <div className="flex items-center gap-2"><span className="hidden text-sm text-slate-500 sm:inline">{adminLogin}</span><button type="button" onClick={() => void logout()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"><LogOut className="h-4 w-4"/>Выйти</button></div>
      </div>
    </header>

    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, Icon }) => <section key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-1 text-3xl font-black text-slate-950">{value}</p></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-50 text-sky-700"><Icon className="h-5 w-5"/></span></div></section>)}</div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={() => setSection('tickets')} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-black ${section === 'tickets' ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}><MessageCircle className="h-4 w-4"/>Обращения</button>
        <button type="button" onClick={() => setSection('users')} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-black ${section === 'users' ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}><Users className="h-4 w-4"/>Пользователи</button>
      </div>

      {section === 'tickets' ? <section className="mt-3 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="text-xl font-black">Обращения пользователей</h2><p className="mt-1 text-sm text-slate-500">Время отображается по Москве.</p></div>
          <div className="flex flex-wrap gap-2">
            {([['waiting','Ждут ответа'],['open','Все открытые'],['closed','Закрытые']] as const).map(([id, label]) => <button key={id} type="button" onClick={() => { setFilter(id); setOffset(0); }} className={`min-h-10 rounded-xl px-3 text-sm font-bold ${filter === id ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>{label}</button>)}
            <button type="button" onClick={() => void loadDashboard()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>Обновить</button>
          </div>
        </div>
        {notice && <div className="m-4 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{notice}</div>}
        <div className="divide-y divide-slate-100">
          {!loading && tickets.length === 0 && <div className="p-8 text-center text-slate-500">В этом списке пока нет тикетов.</div>}
          {tickets.map((ticket) => <div key={ticket.ticket_id} className="flex flex-col gap-3 p-4 hover:bg-slate-50 lg:flex-row lg:items-center">
            <button type="button" onClick={() => void openTicket(ticket.ticket_id)} className="min-w-0 flex-1 text-left">
              <div className="flex flex-wrap items-center gap-2"><span className="font-black text-slate-950">#{ticket.ticket_no}</span>{ticket.admin_unread && <span className="h-2.5 w-2.5 rounded-full bg-red-500" aria-label="Новое сообщение"/>}<span className={`rounded-full px-2 py-1 text-xs font-bold ${ticket.status === 'closed' ? 'bg-slate-100 text-slate-600' : ticket.last_message_author === 'user' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'}`}>{statusLabel(ticket)}</span></div>
              <p className="mt-1 truncate font-bold text-slate-800">{ticket.user_name}</p><p className="mt-1 text-sm text-slate-500">Обращение: {formatTime(ticket.created_at)} · Последнее сообщение: {formatTime(ticket.last_message_at)}</p>
            </button>
            <button type="button" onClick={() => void copyUserId(ticket.user_id)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"><Clipboard className="h-4 w-4"/>{copiedId === ticket.user_id ? 'ID скопирован' : 'Скопировать ID пользователя'}</button>
          </div>)}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-4"><button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold disabled:opacity-40">Назад</button><span className="text-sm font-semibold text-slate-500">Страница {page} из {pageCount}</span><button type="button" disabled={offset + PAGE_SIZE >= totalCount} onClick={() => setOffset(offset + PAGE_SIZE)} className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold disabled:opacity-40">Далее</button></div>
      </section> : <section className="mt-3 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="text-xl font-black">Пользователи OTTO</h2><p className="mt-1 text-sm text-slate-500">Регистрация, суммарное время завершённых тренировок и последняя сессия. Время отображается по Москве.</p></div>
          <button type="button" onClick={() => void loadDashboard()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>Обновить</button>
        </div>
        {notice && <div className="m-4 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{notice}</div>}
        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[1.25fr_1.25fr_1fr_.8fr_1fr] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500">
              <span>Пользователь</span><span>Email / Telegram</span><span>Регистрация</span><span>Время тренировок</span><span>Последняя сессия</span>
            </div>
            {!loading && users.length === 0 && <div className="p-8 text-center text-slate-500">Пользователей пока нет.</div>}
            <div className="divide-y divide-slate-100">
              {users.map((user) => <div key={user.user_id} className="grid grid-cols-[1.25fr_1.25fr_1fr_.8fr_1fr] gap-4 px-4 py-4 text-sm hover:bg-slate-50">
                <div className="min-w-0"><p className="truncate font-black text-slate-900">{user.user_name}</p><button type="button" onClick={() => void copyUserId(user.user_id)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"><Clipboard className="h-3.5 w-3.5"/>{copiedId === user.user_id ? 'ID скопирован' : 'Скопировать ID'}</button>{previewDiagnosticsAvailable&&<button type="button" onClick={() => void openStateDiagnostic(user.user_id)} className="ml-2 mt-2 inline-flex items-center gap-1 text-xs font-semibold text-fuchsia-700 hover:text-fuchsia-900">Диагностика state</button>}</div>
                <div className="min-w-0 text-slate-700"><p className="truncate"><span className="font-semibold text-slate-500">Email:</span> {user.email || '—'}</p><p className="mt-1 truncate"><span className="font-semibold text-slate-500">Telegram:</span> {user.telegram_id || '—'}</p>{user.telegram_id && <button type="button" onClick={() => void openTelegramMessage(user)} className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 text-xs font-bold text-sky-800 hover:bg-sky-100"><Send className="h-3.5 w-3.5"/>Написать</button>}</div>
                <div className="font-semibold text-slate-700">{formatTime(user.registered_at)}</div>
                <div className="font-black text-slate-900">{formatTrainingTime(user.training_seconds)}</div>
                <div className="font-semibold text-slate-700">{formatTime(user.last_session_at)}</div>
              </div>)}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-4"><button type="button" disabled={userOffset === 0} onClick={() => setUserOffset(Math.max(0, userOffset - PAGE_SIZE))} className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold disabled:opacity-40">Назад</button><span className="text-sm font-semibold text-slate-500">Страница {userPage} из {userPageCount}</span><button type="button" disabled={userOffset + PAGE_SIZE >= usersTotalCount} onClick={() => setUserOffset(userOffset + PAGE_SIZE)} className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold disabled:opacity-40">Далее</button></div>
      </section>}
    </main>

    {telegramRecipient && <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !telegramBusy) setTelegramRecipient(null); }}>
      <div role="dialog" aria-modal="true" aria-label="Написать пользователю в Telegram" className="w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-black">Написать в Telegram</h2><p className="mt-1 text-sm text-slate-500">{telegramRecipient.user_name} · Telegram ID {telegramRecipient.telegram_id}</p></div><button type="button" aria-label="Закрыть" onClick={() => setTelegramRecipient(null)} disabled={telegramBusy} className="grid h-10 w-10 place-items-center rounded-xl border"><X className="h-5 w-5"/></button></div>
        <p className="mt-4 text-sm text-slate-600">{telegramStatusLoading ? 'Проверяем историю…' : telegramLastSent ? `Telegram принял предыдущее сообщение: ${formatTime(telegramLastSent)}` : 'Успешных отправок ещё не зафиксировано.'}</p>
        <label className="mt-4 block text-sm font-bold">Сообщение<textarea autoFocus rows={5} maxLength={2000} value={telegramMessage} onChange={(e) => setTelegramMessage(e.target.value)} className="mt-2 w-full resize-y rounded-xl border border-slate-300 p-3 text-sm leading-6" placeholder="Напишите сообщение пользователю…" /></label>
        <p className="mt-1 text-right text-xs text-slate-400">{telegramMessage.length}/2000</p>
        <button type="button" onClick={() => setTelegramMessage('Здравствуйте! Вы недавно зарегистрировались в OTTO 😊\n\nХотела уточнить, всё ли получилось открыть и начать тренировку?\n\nЕсли возникли вопросы — просто ответьте на сообщение, я помогу.')} className="mt-2 min-h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold">Подставить приветственный шаблон</button>
        {telegramError && <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">{telegramError}</p>}
        <button type="button" onClick={() => void sendTelegramMessage()} disabled={!telegramMessage.trim() || telegramBusy || telegramStatusLoading} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 font-black text-white disabled:opacity-50"><Send className="h-4 w-4"/>{telegramBusy ? 'Отправляем…' : 'Отправить через OTTO-бота'}</button>
        <p className="mt-3 text-xs leading-5 text-slate-500">Telegram может отказать, если пользователь не начал диалог с ботом или заблокировал его. Успешная отправка не означает, что сообщение прочитано.</p>
      </div>
    </div>}

    {(stateDiagnosticUserId || stateDiagnosticLoading) && <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b p-4 sm:p-5">
          <div><p className="text-xs font-black uppercase tracking-wider text-fuchsia-700">PREVIEW ONLY</p><h2 className="mt-1 text-2xl font-black">State пользователя</h2><p className="mt-1 break-all text-xs text-slate-500">{stateDiagnosticUserId}</p></div>
          <button type="button" onClick={()=>{setStateDiagnosticUserId('');setStateDiagnosticRows([])}} className="grid h-10 w-10 place-items-center rounded-xl border"><X className="h-5 w-5"/></button>
        </div>
        <div className="flex-1 overflow-auto p-4 sm:p-5">
          {stateDiagnosticLoading?<p className="text-slate-500">Загружаем состояние…</p>:<div className="space-y-4">{stateDiagnosticRows.map(row=><section key={row.state_key} className="rounded-2xl border bg-slate-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><b className="break-all">{row.state_key}</b><span className="text-xs text-slate-500">{formatTime(row.updated_at)}</span></div><pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-slate-950 p-3 text-[11px] leading-5 text-slate-100">{row.state_value??'— ключ отсутствует —'}</pre></section>)}</div>}
        </div>
      </div>
    </div>}

    {(detail || detailLoading) && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !actionBusy) setDetail(null); }}>
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        {detailLoading && !detail ? <div className="p-8 text-center text-slate-500">Открываем тикет…</div> : detail && <>
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4 sm:p-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-black">Тикет #{detail.ticket.ticket_no}</h2><span className={`rounded-full px-2 py-1 text-xs font-bold ${detail.ticket.status === 'closed' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800'}`}>{detail.ticket.status === 'closed' ? 'Закрыт' : 'Открыт'}</span></div><p className="mt-1 text-sm text-slate-500">{detail.ticket.user_name} · {formatTime(detail.ticket.created_at)}</p><button type="button" onClick={() => void copyUserId(detail.ticket.user_id)} className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"><Clipboard className="h-4 w-4"/>{copiedId === detail.ticket.user_id ? 'ID пользователя скопирован' : 'Скопировать ID пользователя'}</button></div><button type="button" onClick={() => setDetail(null)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200"><X className="h-5 w-5"/></button></div>
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4 sm:p-5">{detail.messages.map((message) => <div key={message.id} className={`flex ${message.author_type === 'admin' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 ${message.author_type === 'admin' ? 'bg-sky-700 text-white' : 'border border-slate-200 bg-white text-slate-900'}`}><p className="whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p><p className={`mt-2 text-xs ${message.author_type === 'admin' ? 'text-sky-100' : 'text-slate-400'}`}>{message.author_type === 'admin' ? `Поддержка${message.admin_login ? ` · ${message.admin_login}` : ''}` : detail.ticket.user_name} · {formatTime(message.created_at)}</p></div></div>)}</div>
          <div className="border-t border-slate-200 p-4 sm:p-5">
            {detail.ticket.status === 'open' ? <><textarea value={reply} onChange={(e) => setReply(e.target.value)} maxLength={8000} rows={4} placeholder="Напишите ответ пользователю…" className="w-full resize-y rounded-2xl border border-slate-300 p-3 text-sm leading-6 outline-none focus:border-sky-500"/><div className="mt-3 flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => void sendReply()} disabled={actionBusy || !reply.trim()} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 font-black text-white disabled:opacity-50"><Send className="h-4 w-4"/>Отправить ответ</button><button type="button" onClick={() => void closeTicket()} disabled={actionBusy} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 font-bold text-slate-700 disabled:opacity-50"><Check className="h-4 w-4"/>Закрыть тикет</button></div></> : <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600">Тикет закрыт {formatTime(detail.ticket.closed_at)}. Переписка доступна только для чтения.</div>}
          </div>
        </>}
      </div>
    </div>}
  </div>;
}

export default AdminApp;
