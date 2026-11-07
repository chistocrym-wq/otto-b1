// Store each attempt by authenticated user and immutable activityId.
// An acknowledged request is removed only when the server confirms HTTP 2xx.
export interface ProgressScoreWrite {
  activityId: string;
  moduleKey: string;
  score: number;
  total: number;
  durationSeconds: number;
  occurredAt: string;
}
const PREFIX = 'otto-progress-outbox-v1:';
const inFlight = new Set<string>();
function key(userId: string) { return PREFIX + encodeURIComponent(userId); }
export function readProgressOutbox(userId: string): ProgressScoreWrite[] {
  try {
    const rows: unknown = JSON.parse(localStorage.getItem(key(userId)) || '[]');
    if (!Array.isArray(rows)) return [];
    return rows.filter((v): v is ProgressScoreWrite =>
      Boolean(v && typeof v === 'object' &&
       typeof v.activityId === 'string' && typeof v.moduleKey === 'string' &&
       Number.isFinite(v.score) && Number.isFinite(v.total) && v.total > 0 &&
       typeof v.occurredAt === 'string')).slice(-450);
  } catch { return []; }
}
function store(userId: string, list: ProgressScoreWrite[]) {
  try {
    if (!list.length) localStorage.removeItem(key(userId));
    else localStorage.setItem(key(userId), JSON.stringify(list));
  } catch { /* Fail gracefully on storage quota, without losing UI functionality. */ }
}
export function enqueueProgressScore(userId: string, payload: ProgressScoreWrite) {
  const pending = readProgressOutbox(userId);
  if (!pending.some(row => row.activityId === payload.activityId)) {
    store(userId, [...pending, payload].slice(-450));
  }
  void flushProgressOutbox(userId);
}
export function clearProgressOutbox(userId: string) { store(userId, []); }

export async function flushProgressOutbox(userId: string) {
  if (!userId || inFlight.has(userId) || navigator.onLine === false) return;
  inFlight.add(userId);
  try {
    // Guard against sending a former user's pending data under a different cookie.
    const sessionResponse = await fetch('/api/session', { credentials:'same-origin',cache:'no-store' });
    if (!sessionResponse.ok) return;
    const session = await sessionResponse.json().catch(() => null);
    if (!session?.authenticated || session.userId !== userId) return;
    for (const payload of readProgressOutbox(userId)) {
      const response = await fetch('/api/progress', {
        method:'POST', credentials:'same-origin',
        headers:{'content-type':'application/json'},
        body:JSON.stringify(payload),
      });
      if (!response.ok) return;
      // Other tabs may have added records during this request.
      store(userId, readProgressOutbox(userId).filter(row => row.activityId !== payload.activityId));
    }
  } catch { /* Offline: preserve pending entries until next retry. */ }
  finally { inFlight.delete(userId); }
}
export function registerProgressRetry(userId: string) {
  const flush = () => { void flushProgressOutbox(userId); };
  window.addEventListener('online',flush);
  window.addEventListener('focus',flush);
  const interval = window.setInterval(flush,15000);
  flush();
  return () => {
    window.removeEventListener('online',flush);
    window.removeEventListener('focus',flush);
    window.clearInterval(interval);
  };
}
