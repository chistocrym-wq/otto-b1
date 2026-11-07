import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActivityEntry, ModuleProgress, Progress } from '@/types';
import { bootstrapTelegramSession } from '@/lib/accessClient';
import { enqueueProgressScore, flushProgressOutbox, readProgressOutbox, registerProgressRetry, clearProgressOutbox, type ProgressScoreWrite } from '@/lib/progressOutbox';

const STORAGE_KEY = 'goethe-a1-progress';
const ACTIVITY_KEY = 'otto-a1-activity-v1';
const scopedProgressKey = (userId:string) => 'otto-progress-cache-v2:' + encodeURIComponent(userId);
const scopedActivityKey = (userId:string) => 'otto-activity-cache-v2:' + encodeURIComponent(userId);

function cacheProgress(progress: Progress, userId: string) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(progress)
    );
    localStorage.setItem(scopedProgressKey(userId),JSON.stringify(progress));
  } catch {
    // ignore
  }
}

function cacheActivity(activity: ActivityEntry[], userId: string) {
  try {
    localStorage.setItem(
      ACTIVITY_KEY,
      JSON.stringify(activity)
    );
    localStorage.setItem(scopedActivityKey(userId),JSON.stringify(activity));
  } catch {
    // ignore
  }
}

function normalizeProgress(value: unknown): Progress {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return {};
  }

  const result: Progress = {};

  for (const [key, raw] of Object.entries(value)) {
    if (
      !raw ||
      typeof raw !== 'object' ||
      Array.isArray(raw)
    ) {
      continue;
    }

    const row = raw as Record<string, unknown>;

    const completed =
      Number(row.completed) || 0;

    const total =
      Number(row.total) || 0;

    const bestScore =
      Math.max(
        0,
        Math.min(100, Number(row.bestScore) || 0)
      );

    const lastScore =
      Math.max(
        0,
        Math.min(100, Number(row.lastScore) || 0)
      );

    const attempts =
      Math.max(
        0,
        Math.round(Number(row.attempts) || 0)
      );

    const answered =
      Number.isFinite(Number(row.answered))
        ? Number(row.answered)
        : undefined;

    const correct =
      Number.isFinite(Number(row.correct))
        ? Number(row.correct)
        : undefined;

    const recentScores =
      Array.isArray(row.recentScores)
        ? row.recentScores
            .map(Number)
            .filter(Number.isFinite)
            .map((score) =>
              Math.max(0, Math.min(100, score))
            )
            .slice(-8)
        : [];

    result[key] = {
      completed,
      total,
      bestScore,
      lastScore,
      attempts,
      answered,
      correct,
      recentScores,
    } as ModuleProgress;
  }

  return result;
}

function normalizeActivity(value: unknown): ActivityEntry[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((raw) => {
      if (
        !raw ||
        typeof raw !== 'object' ||
        Array.isArray(raw)
      ) {
        return null;
      }

      const row =
        raw as Record<string, unknown>;

      const id =
        typeof row.id === 'string'
          ? row.id
          : '';

      const module =
        typeof row.module === 'string'
          ? row.module
          : '';

      if (!id || !module) return null;

      return {
        id,
        module,
        score: Number(row.score) || 0,
        total: Number(row.total) || 0,
        percent: Math.max(
          0,
          Math.min(
            100,
            Math.round(Number(row.percent) || 0)
          )
        ),
        at:
          typeof row.at === 'string'
            ? row.at
            : new Date().toISOString(),
        durationSeconds: Math.max(
          0,
          Math.min(
            1800,
            Math.round(
              Number(row.durationSeconds) || 0
            )
          )
        ),
      } as ActivityEntry;
    })
    .filter(
      (item): item is ActivityEntry =>
        item !== null
    )
    .slice(0, 300);
}


async function sendReset() {
  const send = () =>
    fetch('/api/progress', {
      method: 'DELETE',
      credentials: 'same-origin',
    });

  try {
    let response = await send();

    if (response.status === 401) {
      await bootstrapTelegramSession();
      response = await send();
    }

    return response.ok;
  } catch {
    return false;
  }
}

function createActivityId(key: string) {
  try {
    if (
      typeof globalThis.crypto?.randomUUID ===
      'function'
    ) {
      return `${key}-${globalThis.crypto.randomUUID()}`;
    }
  } catch {
    // ignore
  }

  return `${Date.now()}-${key}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function applyScore(progress: Progress, payload: ProgressScoreWrite): Progress {
  const percentageResult = payload.total === 100;
  const unitTotal = percentageResult ? 1 : payload.total;
  const unitScore = percentageResult
    ? Math.max(0,Math.min(100,payload.score))/100
    : Math.max(0,Math.min(payload.total,payload.score));
  const percent = Math.round(unitScore / unitTotal * 100);
  const existing = progress[payload.moduleKey];
  const answered = (existing?.answered ?? 0) + unitTotal;
  const correct = (existing?.correct ?? 0) + unitScore;
  return { ...progress, [payload.moduleKey]: {
    completed: answered, total: answered, answered, correct,
    bestScore: Math.max(existing?.bestScore ?? 0,percent),
    lastScore: percent, attempts:(existing?.attempts ?? 0)+1,
    recentScores:[...(existing?.recentScores ?? []),percent].slice(-8),
  } as ModuleProgress };
}
function pendingActivity(payload: ProgressScoreWrite): ActivityEntry {
  return { id: payload.activityId, module: payload.moduleKey,
    score: payload.score, total:payload.total,
    percent:Math.round((Math.max(0,Math.min(payload.score,payload.total))/payload.total)*100),
    at:payload.occurredAt, durationSeconds:payload.durationSeconds };
}
const CACHE_OWNER = 'otto-progress-cache-owner-v1';
function trustedLocal(userId: string) {
  try {
    // Legacy cache was written before CACHE_OWNER existed. Reuse it only
    // when the authenticated profile already identifies the same owner.
    return localStorage.getItem(CACHE_OWNER) === userId ||
      (!localStorage.getItem(CACHE_OWNER) &&
       localStorage.getItem('otto-user-profile-owner-v1') === userId);
  } catch { return false; }
}
function readCached(userId:string){
  const empty={progress:{} as Progress,activity:[] as ActivityEntry[]};
  try {
    const ownProgress=localStorage.getItem(scopedProgressKey(userId));
    const ownActivity=localStorage.getItem(scopedActivityKey(userId));
    if (ownProgress !== null || ownActivity !== null) return {
      progress:normalizeProgress(JSON.parse(ownProgress||'{}')),
      activity:normalizeActivity(JSON.parse(ownActivity||'[]'))
    };
    // Preserve legacy progress only for its verified historical owner.
    if (!trustedLocal(userId)) return empty;
    return {progress:normalizeProgress(JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')),
      activity:normalizeActivity(JSON.parse(localStorage.getItem(ACTIVITY_KEY)||'[]'))};
  } catch {return empty;}
}

export function useProgress(userId?: string) {
  const [progress, setProgress] = useState<Progress>({});
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [loadedOwner,setLoadedOwner] = useState<string|null>(null);
  const liveUserRef=useRef(userId);
  liveUserRef.current=userId;
  useEffect(() => {
    // React may render the next user before the previous progress state is reset.
    if (!userId || !ready || loadedOwner !== userId || liveUserRef.current !== userId) return;
    try {
      localStorage.setItem(CACHE_OWNER,userId);
      cacheProgress(progress,userId);
      cacheActivity(activity,userId);
    } catch { /* Cache is optional. Server and pending queue remain authoritative. */ }
  },[userId,loadedOwner,ready,progress,activity]);

  useEffect(() => {
    let cancelled=false;
    if (!userId) {
      setLoadedOwner(null);
      setProgress({});
      setActivity([]);
      setReady(true);
      return;
    }
    setReady(false);
    setLoadedOwner(null);
    const fallback=readCached(userId);
    setProgress(fallback.progress);
    setActivity(fallback.activity);
    const unregister=registerProgressRetry(userId);
    const hydrate=async()=>{
      try {
        const session=await bootstrapTelegramSession();
        if (!session.authenticated || session.userId!==userId) return;
        const response=await fetch('/api/progress',{method:'GET',credentials:'same-origin',cache:'no-store'});
        if (!response.ok) return;
        const data=await response.json().catch(()=>null);
        if (!data || data.authenticated!==true || cancelled || liveUserRef.current !== userId) return;
        let remoteProgress=normalizeProgress(data.progress);
        let remoteActivity=normalizeActivity(data.activity);
        const seen=new Set(remoteActivity.map(entry=>entry.id));
        // Pending attempts are newer and must not disappear during GET/hydration.
        for(const item of readProgressOutbox(userId)){
          if(seen.has(item.activityId))continue;
          seen.add(item.activityId);
          remoteProgress=applyScore(remoteProgress,item);
          remoteActivity=[pendingActivity(item),...remoteActivity].slice(0,300);
        }
        if (!cancelled && liveUserRef.current === userId) {
          setProgress(remoteProgress);
          setActivity(remoteActivity);
          try { localStorage.setItem(CACHE_OWNER,userId); } catch {}
        }
      } catch {
        // Show the authenticated user's cached state until the network returns.
        // Never propagate an unhandled Promise rejection from a failed GET.
      } finally {
        if (!cancelled && liveUserRef.current === userId) {
          setLoadedOwner(userId);
          setReady(true);
          void flushProgressOutbox(userId);
        }
      }
    };
    void hydrate();
    return ()=>{cancelled=true;unregister()};
  },[userId]);

  const recordScore = useCallback(
    (key: string, score: number, total: number, durationSeconds = 0) => {
      if (!userId || !ready || loadedOwner !== userId || liveUserRef.current !== userId ||
          !Number.isFinite(score) || !Number.isFinite(total) || total <= 0) return;
      const payload: ProgressScoreWrite = {
        activityId:createActivityId(key),
        moduleKey:key, score, total,
        durationSeconds:Math.max(0,Math.min(1800,Math.round(durationSeconds))),
        occurredAt:new Date().toISOString(),
      };
      setProgress(prev=>applyScore(prev,payload));
      setActivity(prev=>[pendingActivity(payload),...prev].slice(0,300));
      enqueueProgressScore(userId,payload);
    },
    [userId,loadedOwner,ready]
  );

  const markCompleted = useCallback(
    (key: string, total: number) =>
      recordScore(
        key,
        total,
        total
      ),
    [recordScore]
  );

  const resetProgress =
    useCallback(() => {
      if (!userId || !ready || loadedOwner !== userId || liveUserRef.current !== userId) return;
      setProgress({});
      setActivity([]);

      try {
        localStorage.removeItem(
          STORAGE_KEY
        );
        localStorage.removeItem(
          ACTIVITY_KEY
        );
        localStorage.removeItem(scopedProgressKey(userId));
        localStorage.removeItem(scopedActivityKey(userId));
      } catch {
        // ignore
      }

      if(userId)clearProgressOutbox(userId);
      void sendReset();
    }, [userId,loadedOwner,ready]);

  return {
    progress: loadedOwner === userId ? progress : {},
    activity: loadedOwner === userId ? activity : [],
    ready: ready && (!userId || loadedOwner === userId),
    recordScore,
    markCompleted,
    resetProgress,
  };
}
