export type ActiveTrainingView =
  | 'lesen'
  | 'horen'
  | 'schreiben'
  | 'sprechen'
  | 'phrases-speaking'
  | 'daily-training';

export type ActiveTrainingDetail =
  | 'lesen-teil1'
  | 'lesen-teil2'
  | 'lesen-teil3'
  | 'horen-teil1'
  | 'horen-teil2'
  | 'horen-teil3'
  | 'schreiben-teil1'
  | 'schreiben-teil2'
  | 'schreiben-guided'
  | 'schreiben-coach'
  | 'schreiben-solo'
  | 'sprechen-teil1'
  | 'sprechen-teil2'
  | 'sprechen-teil3'
  | 'sprechen-free'
  | 'sprechen-extra';

export interface TrainingResume {
  schreibenTeil1: number;
  schreibenTeil2: number;
  sprechenTeil2: number;
  sprechenFree: number;
  sprechenTeil3: number;
  sprechenExtra: number;
  phraseSpeaking: number;
  activeTrainingView: ActiveTrainingView | null;
  activeTrainingDetail: ActiveTrainingDetail | null;
  dailyTrainingMinutes: 5 | 15 | 30 | null;
}

const KEY = 'otto-training-resume-v1';

const ACTIVE_VIEWS = new Set<ActiveTrainingView>([
  'lesen',
  'horen',
  'schreiben',
  'sprechen',
  'phrases-speaking',
  'daily-training',
]);

const ACTIVE_DETAILS = new Set<ActiveTrainingDetail>([
  'lesen-teil1',
  'lesen-teil2',
  'lesen-teil3',
  'horen-teil1',
  'horen-teil2',
  'horen-teil3',
  'schreiben-teil1',
  'schreiben-teil2',
  'schreiben-guided',
  'schreiben-coach',
  'schreiben-solo',
  'sprechen-teil1',
  'sprechen-teil2',
  'sprechen-teil3',
  'sprechen-free',
  'sprechen-extra',
]);

const EMPTY: TrainingResume = {
  schreibenTeil1: 0,
  schreibenTeil2: 0,
  sprechenTeil2: 0,
  sprechenFree: 0,
  sprechenTeil3: 0,
  sprechenExtra: 0,
  phraseSpeaking: 0,
  activeTrainingView: null,
  activeTrainingDetail: null,
  dailyTrainingMinutes: null,
};

function safeNumber(value: unknown, max: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(max, Math.floor(number)));
}

function safeActiveView(value: unknown): ActiveTrainingView | null {
  return typeof value === 'string' && ACTIVE_VIEWS.has(value as ActiveTrainingView)
    ? value as ActiveTrainingView
    : null;
}

function safeActiveDetail(value: unknown): ActiveTrainingDetail | null {
  return typeof value === 'string' && ACTIVE_DETAILS.has(value as ActiveTrainingDetail)
    ? value as ActiveTrainingDetail
    : null;
}

function safeDailyMinutes(value: unknown): 5 | 15 | 30 | null {
  const minutes = Number(value);
  return minutes === 5 || minutes === 15 || minutes === 30
    ? minutes
    : null;
}

export function readTrainingResume(): TrainingResume {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}') as Partial<TrainingResume>;
    return {
      schreibenTeil1: safeNumber(raw.schreibenTeil1, 999),
      schreibenTeil2: safeNumber(raw.schreibenTeil2, 999),
      sprechenTeil2: safeNumber(raw.sprechenTeil2, 999),
      sprechenFree: safeNumber(raw.sprechenFree, 999),
      sprechenTeil3: safeNumber(raw.sprechenTeil3, 999),
      sprechenExtra: safeNumber(raw.sprechenExtra, 999),
      phraseSpeaking: safeNumber(raw.phraseSpeaking, 999),
      activeTrainingView: safeActiveView(raw.activeTrainingView),
      activeTrainingDetail: safeActiveDetail(raw.activeTrainingDetail),
      dailyTrainingMinutes: safeDailyMinutes(raw.dailyTrainingMinutes),
    };
  } catch {
    return { ...EMPTY };
  }
}

export function saveTrainingResume(patch: Partial<TrainingResume>) {
  try {
    const current = readTrainingResume();
    localStorage.setItem(KEY, JSON.stringify({ ...current, ...patch }));
  } catch {
    /* local persistence is best-effort */
  }
}

export function clearActiveTrainingResume() {
  saveTrainingResume({
    activeTrainingView: null,
    activeTrainingDetail: null,
    dailyTrainingMinutes: null,
  });
}
