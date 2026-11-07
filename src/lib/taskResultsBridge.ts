import type { ModuleId } from '../types';
import type { TaskAttempt, TaskResult } from './taskResults';
import { readVerifiedTaskResultsServerJournals } from './taskResultsServerSnapshot';

/**
 * Read-only compatibility contract for FUTURE journals. This bridge creates,
 * migrates, removes and synchronizes NO records.
 *
 * Key: otto-task-results-v2:<encodeURIComponent(verified userId)>:<module>:<shard>
 * Value: {schemaVersion:2,ownerUserId,module,attempts:[{
 *   attemptId,taskId,score,total,at,skipped?,legacyMirror?
 * }]}
 *
 * attemptId is immutable per logical attempt, across shards/devices.
 * legacyMirror=true ONLY for an exact attempt also present in the v1 history
 * (copied from v1, or mirrored there for an old-client rollback).
 * Future writers MUST use an atomic, server-authoritative append/merge protocol.
 */
export const FUTURE_TASK_RESULTS_PREFIX = 'otto-task-results-v2:';
type ReadableStorage = Pick<Storage, 'getItem' | 'key' | 'length'>;
type RecordedAttempt = TaskAttempt & {
  attemptId: string;
  taskId: string;
  legacyMirror: boolean;
};
const MODULES: readonly ModuleId[] = ['horen', 'lesen', 'schreiben', 'sprechen'];

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function valueOf(storage: ReadableStorage, key: string): string | null {
  try { return storage.getItem(key); } catch { return null; }
}

/** Never attribute an unscoped v1 cache to a different authenticated user. */
export function legacyBelongsToUser(userId: string, storage: ReadableStorage): boolean {
  if (!userId) return false;
  const boundOwner = valueOf(storage, 'otto-state-owner-v2');
  if (boundOwner !== null) return boundOwner === userId;
  return valueOf(storage, 'otto-user-profile-owner-v1') === userId;
}

export function futureTaskResultsKey(userId: string, module: ModuleId, shard: string): string {
  return FUTURE_TASK_RESULTS_PREFIX + encodeURIComponent(userId) + ':' + module + ':' + shard;
}

function normalizeEvent(raw: unknown): RecordedAttempt | null {
  if (!object(raw)) return null;
  const { attemptId, taskId, score, total, at, skipped, legacyMirror } = raw;
  if (typeof attemptId !== 'string' || !attemptId || attemptId.length > 160 ||
      typeof taskId !== 'string' || !taskId || taskId.length > 256 ||
      typeof score !== 'number' || !Number.isFinite(score) ||
      typeof total !== 'number' || !Number.isFinite(total) || total <= 0 ||
      score < 0 || score > total ||
      typeof at !== 'string' || !at || !Number.isFinite(Date.parse(at)) ||
      (skipped !== undefined && typeof skipped !== 'boolean') ||
      (legacyMirror !== undefined && typeof legacyMirror !== 'boolean')) return null;
  return {
    attemptId, taskId, score, total, at,
    ...(skipped === true ? { skipped: true } : {}),
    legacyMirror: legacyMirror === true,
  };
}

function futureAttempts(userId: string, module: ModuleId, storage: ReadableStorage): RecordedAttempt[] {
  if (!userId || !MODULES.includes(module)) return [];
  const prefix = futureTaskResultsKey(userId, module, '');
  const byId = new Map<string, RecordedAttempt | null>();
  let length = 0;
  try { length = storage.length; } catch { return []; }
  const keys: string[] = [];
  for (let index = 0; index < length; index++) {
    let key: string | null = null;
    try { key = storage.key(index); } catch { continue; }
    if (key && key.startsWith(prefix) && /^[a-z0-9][a-z0-9_-]{0,63}$/i.test(key.slice(prefix.length))) {
      keys.push(key);
    }
  }
  // Stable scan order independent of localStorage insertion order or device.
  keys.sort();
  for (const journal of readVerifiedTaskResultsServerJournals(userId, module)) {
    for (const row of journal.attempts) {
      const item = normalizeEvent(row);
      if (!item) continue;
      const prior = byId.get(item.attemptId);
      if (prior === undefined && !byId.has(item.attemptId)) byId.set(item.attemptId, item);
      else if (prior && (prior.taskId !== item.taskId || prior.score !== item.score || prior.total !== item.total || prior.at !== item.at || Boolean(prior.skipped) !== Boolean(item.skipped) || prior.legacyMirror !== item.legacyMirror)) byId.set(item.attemptId, null);
    }
  }
  for (const key of keys) {
    let parsed: unknown;
    try { parsed = JSON.parse(valueOf(storage, key) || 'null'); } catch { continue; }
    if (!object(parsed) || parsed.schemaVersion !== 2 ||
        parsed.ownerUserId !== userId || parsed.module !== module ||
        !Array.isArray(parsed.attempts)) continue;
    for (const row of parsed.attempts) {
      const item = normalizeEvent(row);
      if (!item) continue;
      const existing = byId.get(item.attemptId);
      if (existing === undefined && !byId.has(item.attemptId)) {
        byId.set(item.attemptId, item);
      } else if (existing && (existing.taskId !== item.taskId ||
        existing.score !== item.score || existing.total !== item.total ||
        existing.at !== item.at || Boolean(existing.skipped) !== Boolean(item.skipped) ||
        existing.legacyMirror !== item.legacyMirror)) {
        // Conflicting payloads with one immutable ID are ambiguous.
        // Never silently pick a newer localStorage blob or count both.
        byId.set(item.attemptId, null);
      }
    }
  }
  return [...byId.values()].filter((item): item is RecordedAttempt => item !== null)
    .sort((a, b) => a.at.localeCompare(b.at) || a.attemptId.localeCompare(b.attemptId));
}

function signature(attempt: TaskAttempt): string {
  return JSON.stringify([attempt.score, attempt.total, attempt.at, Boolean(attempt.skipped)]);
}

function summarized(old: TaskResult | undefined, extra: RecordedAttempt[]): TaskResult {
  const oldAttempts = old?.attempts ?? [];
  const matches = new Map<string, number>();
  for (const attempt of oldAttempts) {
    const sig = signature(attempt);
    matches.set(sig, (matches.get(sig) ?? 0) + 1);
  }
  const newAttempts: TaskAttempt[] = [];
  for (const item of extra) {
    const clean: TaskAttempt = {
      score: item.score, total: item.total, at: item.at,
      ...(item.skipped ? { skipped: true } : {}),
    };
    if (item.legacyMirror) {
      const sig = signature(clean);
      const existing = matches.get(sig) ?? 0;
      if (existing > 0) {
        matches.set(sig, existing - 1);
        continue;
      }
    }
    newAttempts.push(clean);
  }
  if (old && newAttempts.length === 0) return old;
  const attempts: TaskAttempt[] = [...oldAttempts, ...newAttempts];
  // Reading MUST NOT apply the current v1 writer's last-32 truncation.
  let best: TaskAttempt | null = null;
  for (const attempt of attempts) {
    if (!attempt.skipped && (!best || attempt.score / attempt.total > best.score / best.total)) {
      best = attempt;
    }
  }
  // Preserve an existing aggregate even if its oldest attempts are not in v1.
  if (old && (!best || (!['skipped'].includes(old.status) &&
      old.score / old.total > best.score / best.total))) {
    if (old.status !== 'skipped') best = { score: old.score, total: old.total, at: '' };
  }
  const first = old ? { score: old.firstScore, total: old.firstTotal } : attempts[0];
  const status: TaskResult['status'] = !best ? 'skipped'
    : best.score >= best.total ? 'correct' : best.score === 0 ? 'incorrect' : 'reviewed';
  const corrected = Boolean(old?.corrected) || (
    status === 'correct' && attempts.some(a => !a.skipped && a.score < a.total)
  );
  return {
    score: best?.score ?? 0,
    total: best?.total ?? attempts[0]?.total ?? 1,
    status, attempts, corrected,
    firstScore: first?.score ?? 0,
    firstTotal: first?.total ?? attempts[0]?.total ?? 1,
  };
}

/**
 * Combine trusted v1 results with authenticated-user future journals.
 * Read-only; returns a new projection and never writes to Storage or server.
 */
export function mergeTaskResultsForUser(
  module: ModuleId,
  verifiedUserId: string,
  legacy: Record<string, TaskResult>,
  storage: ReadableStorage,
): Record<string, TaskResult> {
  if (!verifiedUserId || !MODULES.includes(module)) return {};
  const existing = legacyBelongsToUser(verifiedUserId, storage) ? legacy : {};
  const events = futureAttempts(verifiedUserId, module, storage);
  if (!events.length) return { ...existing };
  const grouped = new Map<string, RecordedAttempt[]>();
  for (const event of events) {
    const list = grouped.get(event.taskId) ?? [];
    list.push(event);
    grouped.set(event.taskId, list);
  }
  const merged: Record<string, TaskResult> = { ...existing };
  for (const [taskId, attempts] of grouped) {
    merged[taskId] = summarized(existing[taskId], attempts);
  }
  return merged;
}
