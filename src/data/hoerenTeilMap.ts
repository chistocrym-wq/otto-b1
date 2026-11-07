import { listeningTasks, type HorenTask } from '@/data/listening';

export type HoerenTeilDecision = 1 | 2 | 3 | 'unresolved';

export interface HoerenTaskTeilMapRow {
  id: string;
  teil: HoerenTeilDecision;
  taskType: HorenTask['type'];
  audio: string;
  image: string;
  answerType: 'A/B/C' | 'Richtig/Falsch';
  title: string;
  prompt: string;
  reason: string;
}

const CONFIRMED_TEIL_1 = new Set([
  'horen-002','horen-004','horen-012','horen-014','horen-016','horen-017',
  'horen-019','horen-021','horen-023','horen-025','horen-026','horen-028',
  'horen-030','horen-032','horen-034','horen-036','horen-038','horen-040',
  'horen-042','horen-043','horen-045',
]);

const CONFIRMED_TEIL_2 = new Set([
  'horen-008','horen-048','horen-054','horen-058','horen-069','horen-074',
]);

const CONFIRMED_TEIL_3 = new Set([
  'horen-001','horen-005','horen-011','horen-015','horen-020','horen-022',
  'horen-027','horen-029','horen-033','horen-035','horen-037','horen-041',
  'horen-044',
]);

export const HOEREN_LEARNING_SELECTION: Record<1 | 2 | 3, readonly string[]> = {
  1: ['horen-002','horen-004','horen-012','horen-014','horen-016'],
  2: ['horen-008','horen-048','horen-054','horen-058','horen-069'],
  3: ['horen-001','horen-005','horen-011','horen-015','horen-020'],
};

function decisionFor(task:HorenTask):HoerenTeilDecision {
  if (CONFIRMED_TEIL_1.has(task.id)) return 1;
  if (CONFIRMED_TEIL_2.has(task.id)) return 2;
  if (CONFIRMED_TEIL_3.has(task.id)) return 3;
  return 'unresolved';
}

function reasonFor(task:HorenTask, teil:HoerenTeilDecision):string {
  if (teil === 1) {
    return 'Подтверждено по исходному содержанию: короткий диалог/разговор с тремя вариантами ответа; используется как Gespräch-Aufgabe.';
  }
  if (teil === 2) {
    return 'Подтверждено по исходному содержанию: публичная Ansage/объявление и исходный формат Richtig/Falsch.';
  }
  if (teil === 3) {
    return 'Подтверждено по исходному содержанию: односторонняя личная Telefon-/Kurznachricht с тремя вариантами ответа.';
  }
  if (task.type === 'true-false') {
    return 'unresolved: исходный формат Richtig/Falsch есть, но содержание — частный разговор/сообщение либо источник не содержит явного Teil; по одному типу ответа Teil не назначаем.';
  }
  return 'unresolved: исходный формат multiple-choice есть, но содержание — публичная Ansage или иной контекст без явного Teil; по одному типу ответа Teil не назначаем.';
}

export const hoerenTaskTeilMap: HoerenTaskTeilMapRow[] = listeningTasks.map(task => {
  const teil = decisionFor(task);
  const number = String(task.number).padStart(3,'0');
  return {
    id: task.id,
    teil,
    taskType: task.type,
    audio: `/audio/${number}.mp3`,
    image: `/images/${number}.png`,
    answerType: task.type === 'multiple-choice' ? 'A/B/C' : 'Richtig/Falsch',
    title: task.title,
    prompt: task.prompt,
    reason: reasonFor(task,teil),
  };
});

export function getHoerenLearningTasks(teil:1|2|3):HorenTask[] {
  const ids = new Set(HOEREN_LEARNING_SELECTION[teil]);
  return listeningTasks.filter(task => ids.has(task.id));
}
