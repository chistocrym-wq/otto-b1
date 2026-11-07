import { ArrowRight, BookOpenCheck, Headphones, Mic2, PenLine } from 'lucide-react';
import type { ModuleId } from '@/types';

const KEY = 'otto-guided-module-intros-v1';

const META: Record<ModuleId, { title: string; goal: string; tip: string; Icon: typeof BookOpenCheck }> = {
  lesen: {
    title: 'Lesen · чтение',
    goal: 'Найдите в тексте конкретную информацию и сравните её с утверждением или вариантом ответа.',
    tip: 'На экзамене не нужно переводить весь текст. Сначала прочитайте вопрос, затем ищите ключевые слова и смысл.',
    Icon: BookOpenCheck,
  },
  horen: {
    title: 'Hören · аудирование',
    goal: 'Слушайте задачу целиком и ловите информацию, которая отвечает именно на вопрос.',
    tip: 'Не пытайтесь понять каждое слово. Особенно важны время, числа, место, отрицания и изменение планов.',
    Icon: Headphones,
  },
  schreiben: {
    title: 'Schreiben · письмо',
    goal: 'Передайте все пункты задания простыми фразами и используйте подходящие приветствие и завершение.',
    tip: 'Короткое правильное предложение лучше длинного сложного. После написания проверьте каждый пункт задания.',
    Icon: PenLine,
  },
  sprechen: {
    title: 'Sprechen · говорение',
    goal: 'Говорите коротко и понятно: представьтесь, задавайте вопросы и формулируйте просьбы.',
    tip: 'На A1 важнее понятная простая фраза, чем сложная конструкция. Говорите вслух и не спешите.',
    Icon: Mic2,
  },
};

const EXTRA:Partial<Record<ModuleId,{title:string;points:string[]}>>={
  horen:{
    title:'Как не попасться на ловушку',
    points:[
      'Сначала прочитайте вопрос и заранее поймите, что нужно услышать: число, время, место, цену или действие.',
      'Не выбирайте вариант только из-за знакомого слова: следите за nicht / kein, aber, leider и за окончательным решением.',
      'В Teil 1 и Teil 3 текст звучит дважды: после первого выберите вероятный ответ, на втором проверьте именно сомнительную деталь.',
      'В Teil 2 каждый текст звучит один раз: вопрос прочитайте заранее и сразу проверяйте всю формулировку Richtig / Falsch.',
    ],
  },
  schreiben:{
    title:'Как набрать баллы проще',
    points:[
      'Сначала выделите все 3 пункта задания и дайте каждому отдельную простую фразу.',
      'Берите надёжные слова и формулировки прямо из задания; не усложняйте грамматику ради эффекта.',
      'Используйте выученные конструкции и готовое обращение/завершение письма.',
      'Перед отправкой проверьте: обращение есть, все 3 пункта закрыты, завершение есть.',
    ],
  },
};

function readSeen(): ModuleId[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is ModuleId => ['lesen', 'horen', 'schreiben', 'sprechen'].includes(String(item))) : [];
  } catch {
    return [];
  }
}

export function hasSeenGuidedModuleIntro(module: ModuleId) {
  return readSeen().includes(module);
}

export function markGuidedModuleIntroSeen(module: ModuleId) {
  const next = Array.from(new Set([...readSeen(), module]));
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
}

export function GuidedModuleIntro({ module, onContinue, onBack }: { module: ModuleId; onContinue: () => void; onBack: () => void }) {
  const meta = META[module];
  const extra=EXTRA[module];
  const Icon = meta.Icon;
  return (
    <div className="animate-fade-in py-4 sm:py-8">
      <section className="mx-auto max-w-2xl rounded-[28px] border border-teal-100 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,.09)] sm:p-7">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><Icon className="h-6 w-6" /></span>
        <p className="mt-5 text-xs font-black uppercase tracking-[.16em] text-teal-700">Отто объясняет новый тип задания</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">{meta.title}</h1>
        <div className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
          <div className="rounded-2xl bg-slate-50 p-4"><b className="text-slate-950">Что делать</b><p className="mt-1">{meta.goal}</p></div>
          <div className="rounded-2xl bg-teal-50 p-4 text-teal-950"><b>Совет для экзамена</b><p className="mt-1">{meta.tip}</p></div>
          {extra&&<div className="rounded-2xl bg-slate-50 p-4"><b className="text-slate-950">{extra.title}</b><ul className="mt-2 space-y-1.5">{extra.points.map(point=><li key={point} className="flex gap-2"><span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600"/><span>{point}</span></li>)}</ul></div>}
        </div>
        <div className="mt-6 grid gap-2 sm:grid-cols-[auto_1fr]">
          <button type="button" onClick={onBack} className="min-h-12 rounded-xl border border-slate-200 bg-white px-5 font-bold text-slate-600">Назад</button>
          <button type="button" onClick={onContinue} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 font-black text-white">Перейти к тренировке <ArrowRight className="h-4 w-4" /></button>
        </div>
      </section>
    </div>
  );
}
