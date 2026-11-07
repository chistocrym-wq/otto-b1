import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import type { ReadingTask } from '@/types';
import { QuestionCard } from '@/components/QuestionCard';
import { ReadingVisual } from './ReadingVisual';
import { useLesenTeil1Progress } from '@/hooks/useLesenTeil1Progress';

interface Teil1RunnerProps {
  tasks: ReadingTask[];
  onBack: () => void;
  onComplete: (score: number, total: number) => void;
}

export function Teil1Runner({
  tasks,
  onBack,
  onComplete,
}: Teil1RunnerProps) {
  const {
    progress,
    record,
    restart,
  } = useLesenTeil1Progress();

  /*
   * Если прошлый круг уже полностью завершён,
   * новый запуск начинается с задания 1.
   */
  const initialTaskIndex =
    progress.lastCompleted >= tasks.length
      ? 0
      : progress.lastCompleted;

  const [currentTaskIndex, setCurrentTaskIndex] =
    useState(initialTaskIndex);

  const [answered, setAnswered] = useState<
    Record<string, boolean>
  >({});

  const [correctAnswers, setCorrectAnswers] =
    useState<Record<string, boolean>>({});

  const [finished, setFinished] = useState(
    progress.lastCompleted >= tasks.length
  );

  const task = tasks[currentTaskIndex];

  if (finished) {
    return (
      <div className="animate-scale-in py-10">
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-teal-50">
            <Trophy className="h-8 w-8 text-teal-700" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900">
            Teil 1 завершён
          </h2>

          <p className="mt-3 text-[17px] leading-7 text-slate-600">
            Все задания этого круга выполнены.
          </p>

          <div className="mt-6 rounded-2xl bg-slate-50 p-5">
            <div className="text-sm text-slate-500">
              Выполнено
            </div>

            <div className="mt-1 text-2xl font-bold text-slate-900">
              {tasks.length} / {tasks.length}
            </div>

            <div className="mt-4 text-sm text-slate-500">
              Сегодня
            </div>

            <div className="mt-1 text-xl font-bold text-slate-900">
              {progress.dailyCompleted}
            </div>

            <div className="text-sm text-slate-500">
              заданий выполнено
            </div>

            <div className="mt-4 text-sm text-slate-500">
              Успешно
            </div>

            <div className="mt-1 text-xl font-bold text-teal-700">
              {progress.dailySuccessful}
            </div>

            <div className="text-sm text-slate-500">
              полностью правильно
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => {
                /*
                 * Новый круг начинается с задания 1.
                 */
                restart();
                setCurrentTaskIndex(0);
                setAnswered({});
                setCorrectAnswers({});
                setFinished(false);
              }}
              className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-[17px] font-semibold text-white transition hover:bg-teal-700"
            >
              <ArrowRight className="h-5 w-5" />
              Начать заново
            </button>

            <button
              type="button"
              onClick={onBack}
              className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-[17px] font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-5 w-5" />
              Вернуться к Lesen
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return null;
  }

  /*
   * Все вопросы текущего задания отвечены?
   */
  const taskComplete =
    task.questions.every(
      (question) => answered[question.id]
    );

  /*
   * Все вопросы текущего задания правильные?
   */
  const taskSuccessful =
    task.questions.every(
      (question) =>
        correctAnswers[question.id] === true
    );

  const handleAnswer = (
    questionId: string,
    correct: boolean
  ) => {
    setAnswered((previous) => ({
      ...previous,
      [questionId]: true,
    }));

    setCorrectAnswers((previous) => ({
      ...previous,
      [questionId]: correct,
    }));
  };

  const handleNext = () => {
    if (!taskComplete) {
      return;
    }

    /*
     * ВАЖНО:
     * если это последнее задание,
     * сначала сохраняем результат,
     * а потом показываем экран завершения.
     */
    record(
      currentTaskIndex,
      taskSuccessful
    );

    if (
      currentTaskIndex <
      tasks.length - 1
    ) {
      setCurrentTaskIndex(
        (previous) => previous + 1
      );

      setAnswered({});
      setCorrectAnswers({});

      return;
    }

    /*
     * Последнее задание завершено.
     */
    onComplete(
      progress.dailySuccessful +
        (taskSuccessful ? 1 : 0),
      progress.dailyCompleted + 1
    );

    setFinished(true);
  };

  return (
    <div className="animate-fade-in">

      {/* Верхняя строка */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white transition hover:bg-slate-50"
          aria-label="Назад"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>

        <div>
          <p className="text-sm text-slate-500">
            Lesen · Teil 1
          </p>

          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Aufgabe {currentTaskIndex + 1} / {tasks.length}
          </h2>
        </div>
      </div>

      {/* Инструкция */}
      <div className="mb-6 rounded-2xl border border-teal-200 bg-teal-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-teal-700" />

          <div>
            <h3 className="text-[18px] font-semibold leading-7 text-teal-900 sm:text-[19px]">
              {task.title}
            </h3>

            <p className="mt-1 text-[18px] leading-8 text-slate-700">
              {task.instruction}
            </p>
          </div>
        </div>
      </div>

      {/* Визуальный источник */}
      <div className="mb-7">
        <ReadingVisual task={task} />
      </div>

      {/* Все вопросы текущего задания */}
      <div className="space-y-5">
        {task.questions.map(
          (question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={index}
              onAnswer={(correct) =>
                handleAnswer(
                  question.id,
                  correct
                )
              }
              showResult={true}
            />
          )
        )}
      </div>

      {/* Кнопка перехода */}
      <div className="mt-7 flex justify-end">
        <button
          type="button"
          onClick={handleNext}
          disabled={!taskComplete}
          className={cn(
            'flex min-h-[54px] items-center gap-2 rounded-xl px-6 py-3 text-[17px] font-semibold transition-all',
            taskComplete
              ? 'bg-teal-600 text-white hover:bg-teal-700'
              : 'cursor-not-allowed bg-slate-100 text-slate-400'
          )}
        >
          {currentTaskIndex <
          tasks.length - 1 ? (
            <>
              Следующее задание
              <ArrowRight className="h-5 w-5" />
            </>
          ) : (
            <>
              Завершить
              <CheckCircle2 className="h-5 w-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}