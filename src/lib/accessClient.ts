const CLIENT_ID_KEY = 'otto-client-id-v1';
const EXPLICIT_LOGOUT_KEY = 'otto-explicit-logout-v1';

export interface AccessCredentials {
  initData: string;
  clientId: string;
}

export interface TelegramLoginAuth {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export interface SessionResult {
  authenticated: boolean;
  userId?: string;
  telegramUserId?: number;
  created?: boolean;
  code?: string;
}

let sessionVisitReported = false;

function sessionRequestUrl(shouldReportVisit: boolean) {
  return shouldReportVisit ? '/api/session?touch=1' : '/api/session';
}

function sessionResult(response: Response, data: Record<string, unknown>): SessionResult {
  const rawTelegramUserId = Number(data.telegramUserId);
  return {
    authenticated: response.ok && data.authenticated === true,
    userId: typeof data.userId === 'string' ? data.userId : undefined,
    telegramUserId:
      Number.isSafeInteger(rawTelegramUserId) && rawTelegramUserId > 0
        ? rawTelegramUserId
        : undefined,
    created: data.created === true,
    code: typeof data.code === 'string' ? data.code : undefined,
  };
}

export function getTelegramInitData() {
  return window.Telegram?.WebApp?.initData || '';
}

export function getClientId() {
  try {
    const existing = window.localStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
    const value = typeof crypto?.randomUUID === 'function'
      ? crypto.randomUUID()
      : `otto-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(CLIENT_ID_KEY, value);
    return value;
  } catch {
    return `otto-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export function getAccessCredentials(): AccessCredentials {
  return {
    initData: getTelegramInitData(),
    clientId: getClientId(),
  };
}

export function hasExplicitLogout() {
  try {
    return window.sessionStorage.getItem(EXPLICIT_LOGOUT_KEY) === '1';
  } catch {
    return false;
  }
}

export function markExplicitLogout() {
  try {
    window.sessionStorage.setItem(EXPLICIT_LOGOUT_KEY, '1');
  } catch {
    // sessionStorage may be unavailable in restricted webviews.
  }
}

export function clearExplicitLogout() {
  try {
    window.sessionStorage.removeItem(EXPLICIT_LOGOUT_KEY);
  } catch {
    // sessionStorage may be unavailable in restricted webviews.
  }
}

export async function getCurrentSession(): Promise<SessionResult> {
  const shouldReportVisit = !sessionVisitReported;
  if (shouldReportVisit) sessionVisitReported = true;

  try {
    const response = await fetch(sessionRequestUrl(shouldReportVisit), {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({})) as Record<string, unknown>;
    const result = sessionResult(response, data);
    if (shouldReportVisit && !result.authenticated) sessionVisitReported = false;
    return result;
  } catch {
    if (shouldReportVisit) sessionVisitReported = false;
    return { authenticated: false, code: 'session_network_error' };
  }
}

async function postTelegramSession(body: Record<string, unknown>): Promise<SessionResult> {
  try {
    const response = await fetch('/api/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({})) as Record<string, unknown>;
    const result = sessionResult(response, data);
    if (result.authenticated) sessionVisitReported = true;
    return result;
  } catch {
    return { authenticated: false, code: 'session_network_error' };
  }
}

export async function bootstrapTelegramSession(options: { createIfMissing?: boolean } = {}): Promise<SessionResult> {
  if (hasExplicitLogout()) {
    return { authenticated: false, code: 'explicit_logout' };
  }

  const current = await getCurrentSession();
  if (current.authenticated) return current;

  const initData = getTelegramInitData();

  if (!initData) {
    return { authenticated: false, code: 'telegram_unavailable' };
  }

  return postTelegramSession({ initData, createIfMissing: options.createIfMissing === true });
}

export async function loginWithTelegramAuth(
  telegramAuth: TelegramLoginAuth,
): Promise<SessionResult> {
  clearExplicitLogout();
  return postTelegramSession({ telegramAuth, createIfMissing: true });
}

export async function logoutSession() {
  markExplicitLogout();

  try {
    const response = await fetch('/api/session', {
      method: 'DELETE',
      credentials: 'same-origin',
    });

    if (!response.ok) {
      clearExplicitLogout();
      return false;
    }

    sessionVisitReported = false;
    return true;
  } catch {
    clearExplicitLogout();
    return false;
  }
}
