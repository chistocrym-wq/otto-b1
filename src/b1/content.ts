/**
 * Data boundary for OTTO B1 exam content.
 * This module intentionally does not import any A1 exam catalog.
 * Published files should be served from /b1/data/<subject>-<teil>.json.
 */
export type B1Subject = 'horen' | 'lesen' | 'schreiben' | 'sprechen';
export type B1AnswerValue = 'richtig' | 'falsch' | 'ja' | 'nein' | '0' | 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j';

export interface B1Set {
  number: number;
  title: string;
  lines: string[];
  audioIds: string[];
  audioAvailable: string[];
  answerKey?: Record<string, B1AnswerValue>;
}
export interface B1Teil {
  subject: string;
  teil: number;
  intro: string[];
  sets: B1Set[];
}

export const B1_PARTS: Readonly<Record<B1Subject, number>> = Object.freeze({
  horen: 4,
  lesen: 5,
  schreiben: 3,
  sprechen: 3,
});

export function b1ContentPath(subject: B1Subject, teil: number): string {
  if (!Number.isInteger(teil) || teil < 1 || teil > B1_PARTS[subject]) {
    throw new Error('Unsupported B1 exam part');
  }
  return `/b1/data/${subject}-${teil}.json`;
}

export function isB1Teil(value: unknown): value is B1Teil {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<B1Teil>;
  return typeof item.subject === 'string' &&
    Number.isInteger(item.teil) &&
    Array.isArray(item.intro) &&
    Array.isArray(item.sets) &&
    item.sets.every((set) =>
      typeof set === 'object' && set !== null &&
      Number.isInteger(set.number) &&
      Array.isArray(set.lines) &&
      set.lines.every((line) => typeof line === 'string') &&
      Array.isArray(set.audioIds) &&
      Array.isArray(set.audioAvailable)
    );
}

export async function loadB1Teil(subject: B1Subject, teil: number, signal?: AbortSignal): Promise<B1Teil> {
  const response = await fetch(b1ContentPath(subject, teil), { signal, credentials: 'same-origin' });
  if (!response.ok) throw new Error(`B1 content unavailable (${response.status})`);
  const data: unknown = await response.json();
  if (!isB1Teil(data)) throw new Error('Malformed B1 content');
  if (data.subject.toLowerCase() !== subject || data.teil !== teil) {
    throw new Error('B1 content identity mismatch');
  }
  return data;
}

export function scoreB1Answers(key: Readonly<Record<string, B1AnswerValue>>, answers: Readonly<Record<string, string>>) {
  const entries = Object.entries(key);
  return {
    total: entries.length,
    answered: entries.filter(([id]) => Boolean(answers[id])).length,
    correct: entries.filter(([id, expected]) => (answers[id] ?? '').trim().toLowerCase() === expected).length,
  };
}

/** Browser-only drafts; server user progress needs a separate B1 backend. */
export function b1DraftKey(userId: string, subject: B1Subject, teil: number, set: number): string {
  if (!userId || !Number.isInteger(set) || set < 1 || set > 30) throw new Error('Invalid B1 draft identity');
  return `otto:b1:draft:${encodeURIComponent(userId)}:${subject}:${teil}:${set}`;
}
