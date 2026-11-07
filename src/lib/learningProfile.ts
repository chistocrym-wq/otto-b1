export interface LearningError {
  tag: string;
  count: number;
  lastSeen: string;
  examples: Array<{ original: string; corrected: string; explanation: string }>;
}

export interface LearningPhrase {
  text: string;
  count: number;
  lastSeen: string;
}

export interface LearningProfile {
  errors: LearningError[];
  phrases: LearningPhrase[];
}

interface WritingFeedbackLike {
  corrections?: Array<{ original: string; corrected: string; explanation: string }>;
}

const KEY = 'otto-a1-learning-profile-v1';

export function loadLearningProfile(): LearningProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { errors: [], phrases: [] };
    const parsed = JSON.parse(raw) as Partial<LearningProfile>;
    return {
      errors: Array.isArray(parsed.errors) ? parsed.errors : [],
      phrases: Array.isArray(parsed.phrases) ? parsed.phrases : [],
    };
  } catch {
    return { errors: [], phrases: [] };
  }
}

function save(profile: LearningProfile) {
  try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch { /* ignore */ }
}

function compact(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function errorTag(explanation: string) {
  const first = compact(explanation).split(/[:—–.-]/u)[0]?.trim();
  if (!first || first.length > 34) return 'Немецкая конструкция';
  const known: Record<string, string> = {
    wortstellung: 'Порядок слов',
    verbform: 'Форма глагола',
    artikel: 'Артикль',
    rechtschreibung: 'Орфография',
    kasus: 'Падеж',
    präposition: 'Предлог',
    praeposition: 'Предлог',
    großschreibung: 'Заглавная буква',
    kleinschreibung: 'Строчная буква',
  };
  return known[first.toLocaleLowerCase('de-DE')] ?? first;
}

function candidatePhrases(text: string, corrections: WritingFeedbackLike['corrections']) {
  const originals = (corrections ?? []).map((item) => compact(item.original).toLocaleLowerCase('de-DE'));
  const pieces = text
    .split(/\n+|(?<=[.!?])\s+/u)
    .map(compact)
    .filter((value) => value.length >= 5 && value.split(/\s+/u).length <= 14)
    .filter((value) => !originals.some((error) => error && value.toLocaleLowerCase('de-DE').includes(error)));
  const corrected = (corrections ?? []).map((item) => compact(item.corrected)).filter((value) => value.split(/\s+/u).length >= 2);
  return [...pieces, ...corrected].filter((value, index, all) => all.findIndex((item) => item.toLocaleLowerCase('de-DE') === value.toLocaleLowerCase('de-DE')) === index);
}

export function recordWritingLearning(text: string, feedback: WritingFeedbackLike) {
  const profile = loadLearningProfile();
  const now = new Date().toISOString();

  for (const correction of feedback.corrections ?? []) {
    const tag = errorTag(correction.explanation);
    const existing = profile.errors.find((item) => item.tag.toLocaleLowerCase() === tag.toLocaleLowerCase());
    const example = { original: compact(correction.original), corrected: compact(correction.corrected), explanation: compact(correction.explanation) };
    if (existing) {
      existing.count += 1;
      existing.lastSeen = now;
      existing.examples = [example, ...existing.examples.filter((item) => item.original !== example.original)].slice(0, 3);
    } else {
      profile.errors.push({ tag, count: 1, lastSeen: now, examples: [example] });
    }
  }

  for (const phrase of candidatePhrases(text, feedback.corrections)) {
    const existing = profile.phrases.find((item) => item.text.toLocaleLowerCase('de-DE') === phrase.toLocaleLowerCase('de-DE'));
    if (existing) {
      existing.count += 1;
      existing.lastSeen = now;
    } else {
      profile.phrases.push({ text: phrase, count: 1, lastSeen: now });
    }
  }

  profile.errors.sort((a, b) => b.count - a.count || b.lastSeen.localeCompare(a.lastSeen));
  profile.phrases.sort((a, b) => b.count - a.count || b.lastSeen.localeCompare(a.lastSeen));
  profile.errors = profile.errors.slice(0, 30);
  profile.phrases = profile.phrases.slice(0, 40);
  save(profile);
  return profile;
}
