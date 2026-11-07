import type { ModuleId } from '../types';

/**
 * Verified, read-only server view of FUTURE task-results journals.
 * No localStorage access, HTTP calls, migrations or user-data writes.
 * Only /api/state's authenticated GET path may publish an accepted snapshot.
 */
export type VerifiedV2Attempt = {
  attemptId: string;
  taskId: string;
  score: number;
  total: number;
  at: string;
  skipped?: boolean;
  legacyMirror?: boolean;
};
export type VerifiedV2Journal = {
  key: string;
  module: ModuleId;
  attempts: ReadonlyArray<VerifiedV2Attempt>;
};

const PREFIX = 'otto-task-results-v2:';
const MODULES: readonly ModuleId[] = ['horen', 'lesen', 'schreiben', 'sprechen'];
const SHARD = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
let verifiedOwner: string | null = null;
let journals: ReadonlyArray<VerifiedV2Journal> = [];

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function validAttempt(row: unknown): row is VerifiedV2Attempt {
  if (!object(row)) return false;
  return typeof row.attemptId === 'string' && row.attemptId.length > 0 && row.attemptId.length <= 160 &&
    typeof row.taskId === 'string' && row.taskId.length > 0 && row.taskId.length <= 256 &&
    typeof row.score === 'number' && Number.isFinite(row.score) &&
    typeof row.total === 'number' && Number.isFinite(row.total) &&
    row.total > 0 && row.score >= 0 && row.score <= row.total &&
    typeof row.at === 'string' && row.at.length > 0 && Number.isFinite(Date.parse(row.at)) &&
    (row.skipped === undefined || typeof row.skipped === 'boolean') &&
    (row.legacyMirror === undefined || typeof row.legacyMirror === 'boolean');
}

function parseJournal(userId: string, key: string, raw: unknown): VerifiedV2Journal | null {
  if (typeof raw !== 'string' || raw.length > 500000) return null;
  const prefix = PREFIX + encodeURIComponent(userId) + ':';
  if (!key.startsWith(prefix)) return null;
  const suffix = key.slice(prefix.length).split(':');
  if (suffix.length !== 2 || !MODULES.includes(suffix[0] as ModuleId) || !SHARD.test(suffix[1])) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return null; }
  if (!object(parsed) || parsed.schemaVersion !== 2 ||
      parsed.ownerUserId !== userId || parsed.module !== suffix[0] ||
      !Array.isArray(parsed.attempts) || !parsed.attempts.every(validAttempt)) return null;
  const attempts: VerifiedV2Attempt[] = parsed.attempts.map(row => ({
    attemptId: row.attemptId,
    taskId: row.taskId,
    score: row.score,
    total: row.total,
    at: row.at,
    ...(row.skipped === true ? { skipped: true } : {}),
    ...(row.legacyMirror === true ? { legacyMirror: true } : {}),
  }));
  return { key, module: suffix[0] as ModuleId, attempts };
}

/**
 * Call ONLY after an authenticated, successful GET /api/state where the
 * response userId exactly equals the independently verified session userId.
 * Validation is fail-closed per shard; no server/local writes or deletions.
 */
export function rememberVerifiedTaskResultsServerSnapshot(
  userId: string,
  serverState: Record<string, unknown>,
): void {
  if (!userId || !object(serverState)) return;
  const prefix = PREFIX + encodeURIComponent(userId) + ':';
  const accepted: VerifiedV2Journal[] = [];
  for (const [key, raw] of Object.entries(serverState)) {
    if (!key.startsWith(prefix)) continue;
    const record = parseJournal(userId, key, raw);
    if (record) accepted.push(record);
  }
  verifiedOwner = userId;
  journals = accepted;
  // Notification only: listeners may update their view; no automatic storage writes.
  if (typeof window !== 'undefined') {
    try { window.dispatchEvent(new Event('otto:task-results-changed')); } catch { /* no DOM */ }
  }
}

export function readVerifiedTaskResultsServerJournals(
  userId: string,
  module: ModuleId,
): ReadonlyArray<VerifiedV2Journal> {
  return userId && verifiedOwner === userId && MODULES.includes(module)
    ? journals.filter(item => item.module === module)
    : [];
}

/** Explicit logout only. Never erase the server's v2 journals. */
export function clearVerifiedTaskResultsServerSnapshot(): void {
  verifiedOwner = null;
  journals = [];
}
