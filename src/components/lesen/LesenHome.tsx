import { useState } from 'react';
import { useLesenTeil1Progress } from '@/hooks/useLesenTeil1Progress';
import { lesenTeil1Tasks } from '@/data/lesen/teil1';
import { BookOpen, ChevronDown, ChevronUp, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLesenTeil2Progress } from '@/hooks/useLesenTeil2Progress';

interface LesenHomeProps {
  onStartTeil1: () => void;
  onStartTeil2: () => void;
}

export function LesenHome({
  onStartTeil1,
  onStartTeil2,
}: LesenHomeProps) {
  const [showRussian, setShowRussian] = useState(false);

  const { progress } = useLesenTeil1Progress();

  const { progress: teil2Progress } = useLesenTeil2Progress(); 

  const teil1Total = lesenTeil1Tasks.length;

  const teil1Progress = Math.min(
    progress.lastCompleted,
    teil1Total
  );

  return (
    <div className="animate-fade-in">
      {/* Заголовок */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50">
            <BookOpen className="h-5 w-5 text-teal-700" />
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Goethe-Zertifikat A1
            </p>

            <h1 className="text-2xl font-bold text-slate-900">
              LESEN
            </h1>
          </div>
        </div>
      </div>

      {/* Объяснение экзамена */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-bold text-slate-900">
          Informationen zur Prüfung
        </h2>

        {!showRussian ? (
          <>
            <p className="text-[16px] leading-7 text-slate-700">
              Im Modul Lesen lesen Sie kurze Texte aus dem Alltag.
              Das Modul besteht aus drei Teilen.
            </p>

            <button
              onClick={() => setShowRussian(true)}
              className="mt-4 flex items-center gap-2 text-sm font-semibold text-teal-700"
            >
              Читать по-русски
              <ChevronDown className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <p className="text-[16px] leading-7 text-slate-700">
              В модуле Lesen вы читаете короткие тексты из
              повседневной жизни. Модуль состоит из трёх частей.
            </p>

            <button
              onClick={() => setShowRussian(false)}
              className="mt-4 flex items-center gap-2 text-sm font-semibold text-teal-700"
            >
              Zurück zum Deutschen
              <ChevronUp className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

     {/* Teil 1 */}

<TeilCard
  number="1"
  title="Kurze Texte"
  description="Lesen Sie kurze Texte und beantworten Sie Fragen."
  total={50}
  dailyCompleted={0}
  dailySuccessful={0}
  progress={0}
  active
  onStart={onStartTeil1}
/>

<TeilCard
  number="2"
  title="Informationen finden"
  description="Finden Sie die passende Information."
  total={50}
  progress={0}
  dailyCompleted={0}
  dailySuccessful={0}
  active={true}
  onStart={onStartTeil2}
/>     

      {/* Teil 3 */}
      <TeilCard
        number="3"
        title="Schilder und Anzeigen"
        description="Lesen Sie Schilder und kurze Anzeigen."
        total={50}
        dailyCompleted={0}
        dailySuccessful={0}
        progress={0}
        active={false}
      />
    </div>
  );
}

interface TeilCardProps {
  number: string;
  title: string;
  description: string;
  total: number;
  dailyCompleted: number;
  dailySuccessful: number;
  progress: number;
  active: boolean;
  onStart?: () => void;
}

function TeilCard({
  number,
  title,
  description,
  total,
  dailyCompleted,
  dailySuccessful,
  progress,
  active,
  onStart,
}: TeilCardProps) {
  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold',
            active
              ? 'bg-teal-50 text-teal-700'
              : 'bg-slate-100 text-slate-400'
          )}
        >
          {number}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-slate-900">
            TEIL {number}
          </h3>

          <p className="mt-1 font-medium text-slate-700">
            {title}
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            {description}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-xs text-slate-400">
                Heute
              </div>

              <div className="mt-1 text-base font-bold text-slate-900">
                {dailyCompleted}
              </div>

              <div className="text-xs text-slate-500">
                gemacht
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-xs text-slate-400">
                Erfolgreich
              </div>

              <div className="mt-1 text-base font-bold text-teal-700">
                {dailySuccessful}
              </div>

              <div className="text-xs text-slate-500">
                heute
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
              <span>Fortschritt</span>
              <span>
                {progress} / {total}
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-teal-600 transition-all"
                style={{
                  width: `${Math.min(
                    (progress / total) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>

          <button
            onClick={onStart}
            disabled={!active}
            className={cn(
              'mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-semibold transition',
              active
                ? 'bg-teal-600 text-white hover:bg-teal-700'
                : 'cursor-not-allowed bg-slate-100 text-slate-400'
            )}
          >
            <Play className="h-4 w-4 fill-current" />

            {active ? 'TRAINING STARTEN' : 'BALD VERFÜGBAR'}
          </button>
        </div>
      </div>
    </div>
  );
}