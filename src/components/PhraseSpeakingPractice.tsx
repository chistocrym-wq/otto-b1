import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Lightbulb, Volume2 } from 'lucide-react';
import { VoiceRecorder } from '@/components/sprechen/VoiceRecorder';
import { HoverTranslateText } from '@/components/common/HoverTranslateText';
import { loadLearningProfile } from '@/lib/learningProfile';
import { readTrainingResume, saveTrainingResume } from '@/lib/trainingResume';

interface Props {
  onBack: () => void;
  onOpenWriting: () => void;
  onComplete: (score: number, total: number) => void;
}

type Level = 1 | 2 | 3 | 4;

const LEVELS: Record<Level, { title: string; note: string }> = {
  1: { title: 'С подсказкой', note: 'Видите всю фразу, слушаете её и повторяете.' },
  2: { title: 'Маленькая подсказка', note: 'Одно важное слово скрыто — восстановите его сами.' },
  3: { title: 'Без текста', note: 'Вспомните фразу из своей письменной практики и скажите её сами.' },
  4: { title: 'Только на слух', note: 'Сначала услышите фразу Отто, текста на экране нет.' },
};

function speak(text: string) {
  const clean = text.trim();
  if (!clean) return;
  const api = (window as Window & { OttoSpeech?: { play?: (value: string, options?: { mode?: 'normal' | 'slow' }) => Promise<boolean> } }).OttoSpeech;
  if (api?.play) {
    void api.play(clean, { mode: 'normal' });
    return;
  }
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = 'de-DE';
  utterance.rate = 0.86;
  window.speechSynthesis.speak(utterance);
}

function maskPhrase(text: string) {
  const words = text.split(/\s+/);
  const candidates = words.map((word, index) => ({ word, index, clean: word.replace(/[^\p{L}]/gu, '') })).filter((item) => item.clean.length >= 5);
  const chosen = candidates.sort((a, b) => b.clean.length - a.clean.length)[0];
  if (!chosen) return text.replace(/\S+$/, '_____');
  return words.map((word, index) => index === chosen.index ? '_____' : word).join(' ');
}

export function PhraseSpeakingPractice({ onBack, onOpenWriting, onComplete }: Props) {
  const profile = useMemo(loadLearningProfile, []);
  const phrases = profile.phrases.map((item) => item.text).filter(Boolean);
  const [index, setIndex] = useState(() => Math.min(readTrainingResume().phraseSpeaking, Math.max(0, phrases.length - 1)));
  const [level, setLevel] = useState<Level>(1);
  const [practiced, setPracticed] = useState(false);
  const phrase = phrases[index] || '';

  const next = () => {
    setIndex((value) => {
      const nextIndex = phrases.length ? (value + 1) % phrases.length : 0;
      saveTrainingResume({ phraseSpeaking: nextIndex });
      return nextIndex;
    });
    setPracticed(false);
  };

  const evaluated = (score: number) => {
    onComplete(score / 100, 1);
    if (score >= 80 && level < 4) setLevel((level + 1) as Level);
  };

  if (!phrases.length) {
    return (
      <div className="animate-fade-in pb-8">
        <Header onBack={onBack} />
        <section className="rounded-[24px] border border-teal-100 bg-white p-5 text-center shadow-sm">
          <BookOpen className="mx-auto h-10 w-10 text-teal-700" />
          <h2 className="mt-3 text-xl font-black text-slate-950">Здесь появятся ваши фразы</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Напишите и проверьте хотя бы одно письмо. Отто возьмёт полезные конструкции из вашей реальной практики и перенесёт их сюда.</p>
          <button type="button" onClick={onOpenWriting} className="mt-4 min-h-11 rounded-xl bg-slate-950 px-5 font-black text-white">Перейти в Schreiben</button>
        </section>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-8">
      <Header onBack={onBack} />
      <section className="rounded-[24px] border border-teal-100 bg-teal-50/70 p-4 sm:p-5">
        <p className="text-xs font-black uppercase tracking-[.14em] text-teal-700">Schreiben → Sprechen</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">Фраза {index + 1} из {phrases.length}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">Эта конструкция уже встречалась в вашей письменной практике. Теперь попробуйте произнести её без подсказки.</p>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-black uppercase tracking-wider text-slate-400">Уровень помощи</p>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {([1, 2, 3, 4] as Level[]).map((value) => <button key={value} type="button" onClick={() => { setLevel(value); setPracticed(false); }} className={`min-h-10 rounded-xl text-sm font-black ${value === level ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-500'}`}>{value}</button>)}
        </div>
        <h3 className="mt-3 font-black text-slate-950">{LEVELS[level].title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">{LEVELS[level].note}</p>
      </section>

      <section className="mt-4 rounded-[24px] border border-slate-200 bg-white p-5 text-center shadow-sm">
        {level === 1 && <div className="text-xl font-black leading-8 text-slate-950"><HoverTranslateText text={phrase} /></div>}
        {level === 2 && <p className="text-xl font-black leading-8 text-slate-950">{maskPhrase(phrase)}</p>}
        {level === 3 && <div className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900"><Lightbulb className="mx-auto mb-2 h-5 w-5" />Вспомните эту фразу без текста. Если совсем не получается, вернитесь на уровень 2.</div>}
        {level === 4 && <div className="rounded-xl bg-sky-50 p-4 text-sm leading-6 text-sky-900">Текст скрыт. Сначала прослушайте Отто, затем скажите фразу по памяти.</div>}
        {(level === 1 || level === 4) && <button type="button" onClick={() => speak(phrase)} className="mx-auto mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 font-bold text-teal-900"><Volume2 className="h-4 w-4" />Слушать Отто</button>}
      </section>

      <div className="mt-4">
        <VoiceRecorder evaluation={{ mode: 'phrase', expectedText: phrase }} onPracticed={() => setPracticed(true)} onEvaluated={evaluated} hint={level === 4 ? 'Скажите фразу после прослушивания, не открывая текст.' : 'Скажите фразу вслух. Отто проверит смысл по распознанной речи.'} />
      </div>

      <button type="button" onClick={next} disabled={!practiced} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 font-black text-white disabled:opacity-40">Следующая фраза <ArrowRight className="h-4 w-4" /></button>
    </div>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return <div className="mb-5 flex items-center gap-3"><button type="button" onClick={onBack} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white" aria-label="Назад"><ArrowLeft className="h-5 w-5" /></button><div><p className="text-xs font-black uppercase tracking-[.14em] text-teal-700">Мои фразы</p><h1 className="text-2xl font-black text-slate-950">Сказать без подсказки</h1></div></div>;
}
