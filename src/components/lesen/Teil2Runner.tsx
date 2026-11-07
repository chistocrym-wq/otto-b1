import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import type { ReadingTeil2Task } from '@/types';
import {
  useLesenTeil2Progress,
} from '@/hooks/useLesenTeil2Progress';
import { Teil2Visual } from './Teil2Visual';

interface Teil2RunnerProps {
  tasks: ReadingTeil2Task[];
  onBack: () => void;
  onComplete: (score: number, total: number) => void;
}

export function Teil2Runner({
  tasks,
  onBack,
  onComplete,
}: Teil2RunnerProps) {
  const {
    progress,
    record,
    restart,
  } = useLesenTeil2Progress();

  const initialTaskIndex =
    progress.lastCompleted >= tasks.length
      ? 0
      : progress.lastCompleted;

  const [currentTaskIndex, setCurrentTaskIndex] =
    useState(initialTaskIndex);

  const [selectedAnswer, setSelectedAnswer] =
    useState<'a' | 'b' | null>(null);

  const [finished, setFinished] =
    useState(
      progress.lastCompleted >= tasks.length
    );

  const task = tasks[currentTaskIndex];

  /*
   * Пользователь выбрал A или B.
   */
  const handleSelect = (answer: 'a' | 'b') => {
    if (selectedAnswer !== null) {
      return;
    }

    setSelectedAnswer(answer);
  };

  /*
   * Переход дальше.
   */
  const handleNext = () => {
    if (!task || selectedAnswer === null) {
      return;
    }

    const successful =
      selectedAnswer === task.correctAnswer;

    record(
      currentTaskIndex,
      successful
    );

    if (
      currentTaskIndex <
      tasks.length - 1
    ) {
      setCurrentTaskIndex(
        (previous) => previous + 1
      );

      setSelectedAnswer(null);

      return;
    }

    onComplete(
      progress.dailySuccessful +
        (successful ? 1 : 0),
      progress.dailyCompleted + 1
    );

    setFinished(true);
  };

  if (finished) {
    return (
      <div className="animate-scale-in py-10">
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-teal-50">
            <Trophy className="h-8 w-8 text-teal-700" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900">
            Teil 2 завершён
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
              правильный ответ
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => {
                restart();
                setCurrentTaskIndex(0);
                setSelectedAnswer(null);
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

  const answerSelected =
    selectedAnswer !== null;

  return (
    <div className="animate-fade-in">
      {/* Верхняя панель */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>

        <div>
          <p className="text-sm text-slate-500">
            Lesen · Teil 2
          </p>

          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Aufgabe {currentTaskIndex + 1} / {tasks.length}
          </h2>
        </div>
      </div>

      {/* Ситуация + A/B */}
      <Teil2Visual
        task={task}
        selectedAnswer={selectedAnswer}
        onSelect={handleSelect}
        disabled={answerSelected}
      />

      {/* Результат */}
      {answerSelected && (
        <div
          className={cn(
            'mt-5 rounded-2xl border px-5 py-4',
            selectedAnswer === task.correctAnswer
              ? 'border-teal-200 bg-teal-50'
              : 'border-red-200 bg-red-50'
          )}
        >
          <div
            className={cn(
              'text-[18px] font-semibold',
              selectedAnswer === task.correctAnswer
                ? 'text-teal-800'
                : 'text-red-800'
            )}
          >
            {selectedAnswer === task.correctAnswer
              ? '✓ Richtig'
              : '✗ Leider falsch'}
          </div>

          <p className="mt-2 text-[17px] leading-7 text-slate-700">
            {selectedAnswer === task.correctAnswer
              ? 'Die gewählte Information passt zur Situation.'
              : `Die richtige Antwort ist ${task.correctAnswer.toUpperCase()}.`}
          </p>
        </div>
      )}

      {/* Кнопка */}
      <div className="mt-7 flex justify-end">
        <button
          type="button"
          onClick={handleNext}
          disabled={!answerSelected}
          className={cn(
            'flex min-h-[54px] items-center gap-2 rounded-xl px-6 py-3 text-[17px] font-semibold transition',
            answerSelected
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