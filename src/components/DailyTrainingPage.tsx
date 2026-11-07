import { useMemo } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Clock3, Headphones, MessageCircleMore, PenLine } from 'lucide-react';
import type { ModuleId, Progress } from '@/types';
import { buildDailyPlan } from '@/lib/preparation';
import type { Minutes } from '@/components/Dashboard';

interface Props {
  minutes: Minutes;
  progress: Progress;
  onBack: () => void;
  onSelectModule: (module: ModuleId) => void;
}

const moduleIcons: Record<ModuleId, typeof PenLine> = {
  schreiben: PenLine,
  sprechen: MessageCircleMore,
  lesen: BookOpen,
  horen: Headphones,
};

export function DailyTrainingPage({ minutes, progress, onBack, onSelectModule }: Props) {
  const plan = useMemo(() => buildDailyPlan(progress, minutes), [progress, minutes]);
  const firstTask = plan[0];

  return (
    <div className="otto-roadmap-page animate-fade-in">
      <header className="otto-roadmap-page-header">
        <button type="button" onClick={onBack} className="otto-roadmap-back" aria-label="Назад">
          <ArrowLeft />
        </button>
        <div>
          <span className="otto-roadmap-kicker">Сегодня</span>
          <h1>Ваша тренировка на сегодня</h1>
        </div>
        <span className="otto-roadmap-time-badge"><Clock3 /> {minutes} мин</span>
      </header>

      <section className="otto-roadmap-plan-card" aria-label="План тренировки">
        <p className="otto-roadmap-plan-intro">Отто собрал короткий план с упором на навыки, которым сейчас стоит уделить больше внимания.</p>
        <ol className="otto-roadmap-plan-list">
          {plan.map((item, index) => {
            const Icon = moduleIcons[item.module];
            return (
              <li key={`${item.module}-${index}`}>
                <span className="otto-roadmap-plan-index">{index + 1}</span>
                <span className="otto-roadmap-plan-icon"><Icon /></span>
                <span className="otto-roadmap-plan-text">
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </span>
                <span className="otto-roadmap-plan-minutes">{item.minutes} мин</span>
              </li>
            );
          })}
        </ol>

        <button
          type="button"
          className="otto-roadmap-start"
          onClick={() => firstTask && onSelectModule(firstTask.module)}
          disabled={!firstTask}
        >
          <span>Начать тренировку</span>
          <ArrowRight />
        </button>
      </section>

      <button type="button" onClick={onBack} className="otto-roadmap-change-time">
        Изменить время тренировки
      </button>
    </div>
  );
}
