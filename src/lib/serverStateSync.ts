import { bootstrapTelegramSession } from './accessClient';
import { recordOttoStateSyncDiagnostic } from './previewDiagnostics';
import { rememberVerifiedTaskResultsServerSnapshot, clearVerifiedTaskResultsServerSnapshot } from './taskResultsServerSnapshot';

// All storage changes remain in the existing /api/state + Supabase system.
const MANAGED_KEYS = [
  'otto-a1-hoeren-progress-v2',
  'otto-a1-lesen-progress-v2',
  'otto-lesen-teil1-progress-v2',
  'otto-lesen-teil2-progress-v1',
  'otto-schreiben-path-stage',
  'otto-guided-module-intros-v1',
  'otto-a1-learning-profile-v1',
  'otto-a1-mock-attempts-v1',
  'otto-training-resume-v1',
  'otto-a1-reminder-v1',
  'otto-module-task-completion-v1',
  'otto-reference-intro-seen-v1',
  'otto-reference-smart-cards-v1',
] as const;
const LEARNING_PREFIXES = [
  'otto-preview-learning-v2:',
  'otto-preview-learning-location-v1:',
  'otto-preview-app-mode-v2:',
  'form_training_progress:',
  'otto-preview-hoeren-learning-v2:',
  'otto-preview-lesen-learning-v2:',
  'otto-preview-sprechen-learning-v1:',
  'otto-preview-schreiben-exact-v3:',
  'otto-preview-schreiben-practice-v1:',
] as const;
const ARCHIVE_PREFIX = 'otto-a1-archive-exam-v2:';
const OWNER_KEY = 'otto-state-owner-v2';
const PENDING_PREFIX = 'otto-state-pending-v2:';
const LEGACY_BACKUP = 'otto-legacy-state-unclaimed-v1';
const fixed = new Set<string>(MANAGED_KEYS);
const originalSetItem = Storage.prototype.setItem;
const originalRemoveItem = Storage.prototype.removeItem;
const originalClear = Storage.prototype.clear;
type PendingWrite = { method: 'PUT' | 'DELETE'; value?: string; revision: number };
type PendingMap = Record<string, PendingWrite>;
let activeUserId: string | null = null;
let installed = false;
let flushing = false;
let retryTimer: number | null = null;
let readOnlyRefresh: Promise<void> | null = null;
let logoutGeneration = 0;
let readOnlyRetryAt = 0;
let readOnlyRetryDelay = 12000;

function rawGet(key: string) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function rawSet(key: string, value: string) {
  originalSetItem.call(window.localStorage, key, value);
}
function rawRemove(key: string) {
  originalRemoveItem.call(window.localStorage, key);
}
function isDynamicForUser(key: string, userId: string) {
  if (LEARNING_PREFIXES.some(prefix => key === prefix + userId)) return true;
  const archivePrefix = ARCHIVE_PREFIX + encodeURIComponent(userId) + ':';
  return key.startsWith(archivePrefix) &&
    /^exam-(?:0[1-9]|[12][0-9]|30):(?:stage|results|expired|final|horen-answers|lesen-answers|schreiben-form|schreiben-letter|schreiben-locked-form|schreiben-locked-letter|sprechen-scores|deadline-(?:horen|lesen|schreiben|sprechen)|horen-plays-(?:[1-9]|1[0-5]))$/.test(key.slice(archivePrefix.length));
}
function managed(key: string) {
  return fixed.has(key) || Boolean(activeUserId && isDynamicForUser(key, activeUserId));
}
function allLocalManagedKeys(userId = activeUserId) {
  const result = new Set<string>(MANAGED_KEYS);
  if (!userId) return result;
  try {
    for (let n = 0; n < window.localStorage.length; n++) {
      const key = window.localStorage.key(n);
      if (key && isDynamicForUser(key, userId)) result.add(key);
    }
  } catch { /* Storage may be blocked in a private webview. */ }
  return result;
}
function clearLocalManaged() {
  // Clear all foreign per-user learning/archive keys without deleting server data.
  try {
    const keys: string[] = [];
    for (let n = 0; n < window.localStorage.length; n++) {
      const key = window.localStorage.key(n);
      if (key && (fixed.has(key) || key.startsWith(ARCHIVE_PREFIX) ||
          LEARNING_PREFIXES.some(prefix => key.startsWith(prefix) && !key.endsWith('local')))) keys.push(key);
    }
    for (const key of keys) rawRemove(key);
  } catch { /* Ignore blocked local storage. */ }
}
function pendingKey(userId: string) { return PENDING_PREFIX + encodeURIComponent(userId); }
function readPending(userId: string): PendingMap {
  try {
    const parsed: unknown = JSON.parse(rawGet(pendingKey(userId)) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as PendingMap;
  } catch { return {}; }
}
function writePending(userId: string, value: PendingMap) {
  try {
    if (!Object.keys(value).length) rawRemove(pendingKey(userId));
    else rawSet(pendingKey(userId), JSON.stringify(value));
  } catch { /* Do not prevent local edits when storage is full. */ }
}
function markPending(key: string, method: 'PUT' | 'DELETE', value?: string) {
  if (!activeUserId || !managed(key)) return;
  const pending = readPending(activeUserId);
  pending[key] = { method, value, revision: (pending[key]?.revision ?? 0) + 1 };
  writePending(activeUserId, pending);
  void flushPending();
}
function diagnostic(method: PendingWrite['method'], key: string, status: number | null, ok: boolean, error?: string) {
  recordOttoStateSyncDiagnostic({ method, key, status, ok, error });
  try { window.dispatchEvent(new CustomEvent('otto:state-sync-diagnostic', { detail: { method, key, status, ok } })); } catch {}
}
async function requestState(userId: string, key: string, pending: PendingWrite) {
  const send = () => fetch('/api/state', {
    method: pending.method,
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(pending.method === 'PUT' ? { key, value: pending.value } : { key }),
  });
  try {
    let response = await send();
    if (response.status === 401 && activeUserId === userId) {
      const session = await bootstrapTelegramSession();
      if (session.authenticated) response = await send();
    }
    diagnostic(pending.method, key, response.status, response.ok, response.ok ? undefined : 'HTTP ' + response.status);
    return response.ok;
  } catch (error) {
    diagnostic(pending.method, key, null, false, String(error));
    return false;
  }
}
async function flushPending() {
  if (flushing || !activeUserId || navigator.onLine === false) return;
  flushing = true;
  const owner = activeUserId;
  try {
    for (const [key, write] of Object.entries(readPending(owner))) {
      if (owner !== activeUserId || !isManagedFor(key, owner)) break;
      const ok = await requestState(owner, key, write);
      if (!ok) break;
      const current = readPending(owner);
      if (current[key] && current[key].revision === write.revision &&
          current[key].method === write.method && current[key].value === write.value) {
        delete current[key];
        writePending(owner, current);
      }
    }
  } finally { flushing = false; }
}
function isManagedFor(key: string, userId: string) {
  return fixed.has(key) || isDynamicForUser(key, userId);
}
function installPatch() {
  if (installed) return;
  installed = true;
  Storage.prototype.setItem = function (key: string, value: string) {
    originalSetItem.call(this, key, value);
    if (this === window.localStorage && managed(key)) markPending(key, 'PUT', String(value));
  };
  Storage.prototype.removeItem = function (key: string) {
    originalRemoveItem.call(this, key);
    if (this === window.localStorage && managed(key)) markPending(key, 'DELETE');
  };
  Storage.prototype.clear = function () {
    const local = this === window.localStorage;
    const keys = local && activeUserId ? [...allLocalManagedKeys()] : [];
    originalClear.call(this);
    if (local) for (const key of keys) markPending(key, 'DELETE');
  };
  window.addEventListener('online', () => { void flushPending(); void refreshReadOnlyServerSnapshot(); });
  window.addEventListener('focus', () => { void flushPending(); void refreshReadOnlyServerSnapshot(); });
  if (retryTimer === null) retryTimer = window.setInterval(() => {
    void flushPending();
    if (Date.now() >= readOnlyRetryAt) void refreshReadOnlyServerSnapshot();
  }, 12000);
}
function bindOwner(userId: string) {
  const previous = rawGet(OWNER_KEY);
  // Older authenticated versions stored this verified user ID alongside the profile.
  // It is safe to retain such legacy local state only for the same verified account.
  const trustedLegacyOwner = !previous && rawGet('otto-user-profile-owner-v1') === userId;
  if (previous !== userId && !trustedLegacyOwner) {
    // Unowned legacy keys cannot safely be assigned to whichever account signs in.
    if (!previous) {
      const backup: Record<string, string> = {};
      for (const key of MANAGED_KEYS) {
        const value = rawGet(key);
        if (value !== null) backup[key] = value;
      }
      if (Object.keys(backup).length && !rawGet(LEGACY_BACKUP)) {
        try { rawSet(LEGACY_BACKUP, JSON.stringify(backup)); } catch {}
      }
    }
    clearLocalManaged();
  }
  activeUserId = userId;
  rawSet(OWNER_KEY, userId);
  return previous === userId || trustedLegacyOwner;
}
async function identifySession(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      let response = await fetch('/api/session', {
        method: 'GET', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
      });
      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data?.authenticated && typeof data.userId === 'string') return data.userId;
      }
      const session = await bootstrapTelegramSession();
      if (session.authenticated && typeof session.userId === 'string') return session.userId;
      return null;
    } finally { window.clearTimeout(timeout); }
  } catch { return null; }
}
async function fetchServerState() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);
  try {
    return await fetch('/api/state', {
      method: 'GET', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
    });
  } finally { window.clearTimeout(timeout); }
}
async function hydrateFromServer() {
  const userId = await identifySession();
  if (!userId) {
    // A failed /api/session or offline startup is not proof of a logout.
    // Preserve this account's unsynced local state AND its ownership marker.
    // The fail-closed access gate prevents protected pages from opening here.
    // Explicit logout uses clearLocalUserStateForLogout() instead.
    activeUserId = null;
    return;
  }
  // A verified /api/session identity may resume an existing SAME-OWNER outbox
  // even while /api/state GET is temporarily unavailable. Without this,
  // edits made during that outage would not be journaled and a subsequent
  // successful GET could overwrite them with stale server values.
  // Never claim ownership of unowned/foreign keys or clear any local state here.
  const storedOwner = rawGet(OWNER_KEY);
  if (storedOwner === userId ||
      (!storedOwner && rawGet('otto-user-profile-owner-v1') === userId)) {
    activeUserId = userId;
  }
  // A session identity alone is not a verified state snapshot. In particular, a
  // transient offline/503 startup must not clear pre-update local progress.
  let response: Response;
  try { response = await fetchServerState(); } catch { return; }
  if (!response.ok) return;
  const payload: unknown = await response.json().catch(() => null);
  if (!payload || typeof payload !== 'object') return;
  const data = payload as { authenticated?: boolean; userId?: string; state?: unknown };
  if (data.authenticated !== true || data.userId !== userId ||
      !data.state || typeof data.state !== 'object' || Array.isArray(data.state)) return;
  const remote = data.state as Record<string, unknown>;
  const trustedOwner = bindOwner(userId);
  // Read-only future journals are accepted exclusively from this verified GET.
  rememberVerifiedTaskResultsServerSnapshot(userId, remote);
  const pending = readPending(userId);
  const keys = new Set<string>([...allLocalManagedKeys(userId), ...Object.keys(remote)]);
  for (const key of keys) {
    if (!isManagedFor(key, userId)) continue;
    const change = pending[key];
    if (change) {
      if (change.method === 'PUT' && typeof change.value === 'string') rawSet(key, change.value);
      else rawRemove(key);
      continue;
    }
    const remoteValue = remote[key];
    if (typeof remoteValue === 'string') {
      rawSet(key, remoteValue);
    } else {
      const local = rawGet(key);
      if (trustedOwner && local !== null) markPending(key, 'PUT', local);
      else rawRemove(key);
    }
  }
  void flushPending();
}
// Recover future v2 journals without rehydrating or overwriting legacy local state.
// A failed read never clears the last verified snapshot or any local progress.
function refreshReadOnlyServerSnapshot(): Promise<void> {
  if (readOnlyRefresh || navigator.onLine === false) return readOnlyRefresh ?? Promise.resolve();
  const generation = logoutGeneration;
  const job = (async () => {
    const userId = await identifySession();
    if (!userId || generation !== logoutGeneration ||
        (activeUserId !== null && activeUserId !== userId)) return;
    const response = await fetchServerState();
    if (!response.ok || generation !== logoutGeneration) return;

    const payload: unknown = await response.json().catch(() => null);
    if (!payload || typeof payload !== 'object') return;
    const data = payload as { authenticated?: boolean; userId?: string; state?: unknown };
    if (data.authenticated !== true || data.userId !== userId ||
        !data.state || typeof data.state !== 'object' || Array.isArray(data.state) ||
        generation !== logoutGeneration ||
        (activeUserId !== null && activeUserId !== userId)) return;
    // Never call bindOwner or mutate any local key in this recovery read.
    rememberVerifiedTaskResultsServerSnapshot(userId, data.state as Record<string, unknown>);
    readOnlyRetryDelay = 12000;
    readOnlyRetryAt = Date.now() + readOnlyRetryDelay;
    return;
  })().catch(() => { /* Offline/503 must not clear user data. */ }).finally(() => {
    if (generation === logoutGeneration && readOnlyRetryAt <= Date.now()) {
      readOnlyRetryDelay = Math.min(120000, Math.max(12000, readOnlyRetryDelay * 2));
      readOnlyRetryAt = Date.now() + readOnlyRetryDelay;
    }
  });
  readOnlyRefresh = job;
  void job.finally(() => { if (readOnlyRefresh === job) readOnlyRefresh = null; });
  return job;
}
const LOGOUT_LOCAL_ONLY_KEYS = [
  'otto-user-profile', 'otto-user-profile-owner-v1', 'otto-a1-user-name',
  'otto-onboarding-completed', 'otto-learning-mode-v1',
  'goethe-a1-progress', 'otto-a1-activity-v1',
] as const;
export function clearLocalUserStateForLogout() {
  logoutGeneration++;
  clearVerifiedTaskResultsServerSnapshot();
  clearLocalManaged();
  for (const key of LOGOUT_LOCAL_ONLY_KEYS) rawRemove(key);
  rawRemove(OWNER_KEY);
  activeUserId = null;
  // Pending writes remain privately tied to the original user ID for later retry.
}
export async function initializeServerStateSync() {
  try { await hydrateFromServer(); }
  catch { /* Never erase local state because of a temporary network error. */ }
  finally { installPatch(); }
}
