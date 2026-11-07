import type { ModuleId } from '@/types';

export const MODULE_TASK_TOTALS: Record<ModuleId, number> = {
  lesen: 150,
  horen: 80,
  schreiben: 110,
  sprechen: 127,
};

const KEY = 'otto-module-task-completion-v1';
const LESEN_KEY = 'otto-a1-lesen-progress-v2';
const HOREN_KEY = 'otto-a1-hoeren-progress-v2';

type CompletionStore = Partial<Record<ModuleId, string[]>> & { taskResults?: Record<string, unknown> };

function readJson(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

function readStore(): CompletionStore {
  const raw = readJson(KEY);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: CompletionStore = { taskResults: (raw as CompletionStore).taskResults };
  for (const module of Object.keys(MODULE_TASK_TOTALS) as ModuleId[]) {
    const list = (raw as Record<string, unknown>)[module];
    if (Array.isArray(list)) {
      result[module] = [...new Set(list.map(String).filter(Boolean))].slice(0, MODULE_TASK_TOTALS[module]);
    }
  }
  return result;
}

function legacyIds(module: ModuleId): string[] {
  if (module === 'lesen') {
    const raw = readJson(LESEN_KEY) as Record<string, { credited?: unknown }> | null;
    if (!raw) return [];
    return ['1', '2', '3'].flatMap((part) => {
      const credited = raw[part]?.credited;
      return Array.isArray(credited) ? credited.map(String).filter(Boolean) : [];
    });
  }

  if (module === 'horen') {
    const raw = readJson(HOREN_KEY) as { credited?: unknown } | null;
    return Array.isArray(raw?.credited) ? raw!.credited!.map(String).filter(Boolean) : [];
  }

  return [];
}

export function recordModuleTaskCompletion(module: ModuleId, taskId: string) {
  const clean = String(taskId || '').trim();
  if (!clean) return;

  try {
    const store = readStore();
    const oldJson = readJson(KEY);
    // Keep existing admissible fields (especially taskResults) on a full-key write.
    // The previous normalization of the four completion lists is unchanged.
    const extras = oldJson && typeof oldJson === 'object' && !Array.isArray(oldJson)
      ? Object.fromEntries(Object.entries(oldJson as Record<string, unknown>)
          .filter(([key]) => !Object.prototype.hasOwnProperty.call(MODULE_TASK_TOTALS, key)))
      : {};
    const current = new Set(store[module] ?? []);
    current.add(clean);
    store[module] = [...current].slice(0, MODULE_TASK_TOTALS[module]);
    localStorage.setItem(KEY, JSON.stringify({ ...extras, ...store }));
  } catch {
    // Server-state sync is best-effort; training must remain usable offline.
  }
}

export function hasModuleTaskCompletion(module:ModuleId,taskId:string):boolean{
 const store=readStore();
 return (store[module]??[]).includes(taskId)||legacyIds(module).includes(taskId);
}
export function getModuleCompletion(module: ModuleId) {
  const total = MODULE_TASK_TOTALS[module];
  const ids = new Set([...(readStore()[module] ?? []), ...legacyIds(module)]);
  const completed = Math.min(total, ids.size);
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, total, percent };
}
