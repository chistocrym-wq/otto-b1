import { useState } from 'react';
import { ArrowRight, Eye, RefreshCw, Volume2 } from 'lucide-react';
import { speakingTeil3ArchiveCards } from '@/data/speakingTeil3Archive';
import { CompactTranslationEye } from '@/components/common/CompactTranslationEye';
import { HoverTranslateText } from '@/components/common/HoverTranslateText';
import { Teil3ArchiveImage } from '@/components/sprechen/Teil3ArchiveImage';
import { VoiceRecorder } from '@/components/sprechen/VoiceRecorder';
import { cn } from '@/lib/utils';
import { readTrainingResume, saveTrainingResume } from '@/lib/trainingResume';

interface Props {
 guest?:boolean;
  onEvaluated: (score: number, taskId: string) => void;
  initialIndex?:number;
  manual?:boolean;
  onReturnToList?:()=>void;
}

const instruction = 'Bitten Sie Ihren Partner um etwas. Reagieren Sie kurz auf die Bitte Ihres Partners.';
const instructionRu = 'Попросите партнёра о чём-то по картинке и коротко отреагируйте на его просьбу.';

export function Teil3Practice({ onEvaluated,initialIndex,manual=false,onReturnToList,guest=false }: Props) {
  const [index, setIndex] = useState(() => Math.min(initialIndex??readTrainingResume().sprechenTeil3, guest?1:Math.max(0, speakingTeil3ArchiveCards.length - 1)));
  const [showSample, setShowSample] = useState(false);
  const [practiced, setPracticed] = useState(false);
  const card = speakingTeil3ArchiveCards[index];

  const resetCardState = () => {
    setShowSample(false);
    setPracticed(false);
  };

  const next = () => {
    if(index>=(guest?1:speakingTeil3ArchiveCards.length-1)){onReturnToList?.();return}
    if(readTrainingResume().sprechenTeil3===index)saveTrainingResume({ sprechenTeil3:index+1 });
    setIndex(index+1);
    resetCardState();
  };

  const shuffle = () => {
    if (speakingTeil3ArchiveCards.length <= 1) return;
    setIndex((current) => {
      let nextIndex = current;
      while (nextIndex === current) nextIndex = Math.floor(Math.random() * speakingTeil3ArchiveCards.length);
      return nextIndex;
    });
    resetCardState();
  };

  return (
    <>
      <div className="mb-5 flex items-start justify-between gap-3 rounded-2xl border bg-slate-50 p-5">
        <p className="font-medium leading-7"><HoverTranslateText text={instruction} /></p>
        <CompactTranslationEye parts={[instruction]} translations={[instructionRu]} title="Перевод задания" />
      </div>

      <div className="mx-auto mb-5 max-w-xl overflow-hidden rounded-2xl border border-slate-400 bg-white shadow-sm">
        <div className="bg-slate-100 px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.12em] text-slate-600">
          Teil 3 · Karte {index + 1} von {speakingTeil3ArchiveCards.length}
        </div>
        <div className="p-4 sm:p-6">
          <Teil3ArchiveImage
            imageIndex={card.imageIndex}
            alt={card.alt}
            className="mx-auto w-full max-w-[360px] rounded-xl"
          />
          <div className="mt-3 text-center text-lg font-bold text-slate-900">{card.alt}</div>
        </div>
      </div>

      <VoiceRecorder
        key={card.id}
        evaluation={{ mode: 'teil3', object: card.alt, sampleRequest: card.sampleRequest }}
        onPracticed={() => setPracticed(true)}
        onEvaluated={(score) => onEvaluated(score, card.id)}
        hint="Сформулируйте просьбу по картинке и скажите её вслух."
      />

      <div className="mb-5 rounded-2xl border bg-white p-5">
        <button type="button" onClick={() => setShowSample((value) => !value)} className="inline-flex items-center gap-2 text-sm font-semibold">
          <Eye className="h-4 w-4" />
          {showSample ? 'Скрыть пример' : 'Показать пример после своего ответа'}
        </button>
        {showSample && (
          <div className="mt-4 rounded-xl bg-amber-50 p-4 text-[16px] leading-7">
            <div className="mb-2 text-xs font-bold uppercase text-amber-700">Beispiel</div>
            <SampleAudioLine label="Bitte" text={card.sampleRequest} />
            <SampleAudioLine label="Reaktion" text={card.sampleReaction} />
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 pb-20 sm:flex-row sm:justify-end">
        <button type="button" onClick={shuffle} disabled={guest} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border bg-white px-5 font-semibold">
          <RefreshCw className="h-4 w-4" />
          Случайная карточка
        </button>
        <button type="button" onClick={onReturnToList} className="min-h-[52px] rounded-xl border bg-white px-3 text-sm font-bold">К списку заданий</button>
        <button
          type="button"
          onClick={next}
          disabled={!practiced}
          className={cn(
            'inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl px-6 font-semibold',
            practiced ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400',
          )}
        >
          Далее
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}

function SampleAudioLine({ label, text }: { label: string; text: string }) {
  return (
    <div className="mt-2 flex items-start gap-3 rounded-xl bg-white/70 p-3 first:mt-0">
      <div className="min-w-0 flex-1">
        <span className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-400">{label}</span>
        <HoverTranslateText text={text} />
      </div>
      <button
        type="button"
        onClick={() => speakGerman(text)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-white text-teal-800"
        aria-label={`Прослушать ${label}`}
      >
        <Volume2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function speakGerman(text: string) {
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
  utterance.rate = 0.84;
  const voices = window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith('de'));
  utterance.voice = voices.find((voice) => /natural|premium|google|microsoft/i.test(voice.name)) || voices[0] || null;
  window.speechSynthesis.speak(utterance);
}
