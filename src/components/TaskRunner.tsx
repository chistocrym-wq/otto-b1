import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Trophy, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskRunnerProps {
  title: string;
  subtitle: string;
  tasks: { id: string; title: string; instruction: string; questions?: unknown[] }[];
  onBack: () => void;
  onComplete: (score: number, total: number) => void;
  renderTask: (taskIndex: number, onAnswer: (correct: boolean) => void) => React.ReactNode;
  accentColor: 'teal' | 'sky' | 'amber' | 'rose';
}

const accentMap = {
  teal: { bg: 'bg-teal-600', light: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  sky: { bg: 'bg-sky-600', light: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  amber: { bg: 'bg-amber-600', light: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  rose: { bg: 'bg-rose-600', light: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};

export function TaskRunner({ title, subtitle, tasks, onBack, onComplete, renderTask, accentColor }: TaskRunnerProps) {
  const [currentTask, setCurrentTask] = useState(0);
  const [taskResults, setTaskResults] = useState<{ score: number; total: number }[]>([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentTotal, setCurrentTotal] = useState(0);
  const [finished, setFinished] = useState(false);
  const accent = accentMap[accentColor];

  const handleAnswer = (correct: boolean) => {
    setCurrentTotal((t) => t + 1);
    if (correct) setCurrentScore((s) => s + 1);
  };

  const handleNextTask = () => {
    const newResults = [...taskResults, { score: currentScore, total: currentTotal }];
    setTaskResults(newResults);

    if (currentTask < tasks.length - 1) {
      setCurrentTask((t) => t + 1);
      setCurrentScore(0);
      setCurrentTotal(0);
    } else {
      const score = newResults.reduce((sum, result) => sum + result.score, 0);
      const total = newResults.reduce((sum, result) => sum + result.total, 0);
      onComplete(score, total);
      setFinished(true);
    }
  };

  const handleRetry = () => {
    setCurrentTask(0);
    setTaskResults([]);
    setCurrentScore(0);
    setCurrentTotal(0);
    setFinished(false);
  };

  if (finished) {
    const allResults = taskResults;
    const totalCorrect = allResults.reduce((acc, r) => acc + r.score, 0);
    const totalQuestions = allResults.reduce((acc, r) => acc + r.total, 0);
    const percent = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    return (
      <div className="animate-scale-in flex flex-col items-center justify-center py-12">
        <div className={cn('flex items-center justify-center w-20 h-20 rounded-full mb-6', accent.light)}>
          <Trophy className={cn('w-10 h-10', accent.text)} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Модуль завершён!</h2>
        <p className="text-slate-500 mb-2 text-center max-w-md">
          Вы прошли все задания модуля «{title}»
        </p>
        <div className={cn('text-5xl font-bold mb-8', accent.text)}>
          {percent}%
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 w-full max-w-lg">
          {tasks.map((task, i) => (
            <div key={task.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-400 mb-1">{task.title}</p>
              <p className="text-lg font-bold text-slate-900">
                {allResults[i]?.score ?? 0} / {allResults[i]?.total ?? 0}
              </p>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Пройти заново
          </button>
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors"
          >
            К модулям
          </button>
        </div>
      </div>
    );
  }

  const task = tasks[currentTask];
  const expectedAnswers = task.questions?.length ?? 1;
  const taskComplete = currentTotal >= expectedAnswers;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>

      {/* Task indicator */}
      <div className="flex items-center gap-2 mb-6">
        {tasks.map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-2 flex-1 rounded-full transition-all duration-300',
              i <= currentTask ? accent.bg : 'bg-slate-200'
            )}
          />
        ))}
      </div>

      {/* Task title */}
      <div className={cn('rounded-xl p-4 mb-6 border', accent.light, accent.border)}>
        <h3 className={cn('font-semibold mb-1', accent.text)}>{task.title}</h3>
        <p className="text-sm text-slate-600">{task.instruction}</p>
      </div>

      {/* Task content */}
      <div className="space-y-4 mb-6">
        {renderTask(currentTask, handleAnswer)}
      </div>

      {/* Next button */}
      <div className="flex justify-end">
        <button
          onClick={handleNextTask}
          disabled={!taskComplete}
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all',
            taskComplete
              ? cn(accent.bg, 'text-white hover:opacity-90')
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          )}
        >
          {currentTask < tasks.length - 1 ? (
            <>Следующее задание <ArrowLeft className="w-4 h-4 rotate-180" /></>
          ) : (
            <><CheckCircle2 className="w-4 h-4" /> Завершить модуль</>
          )}
        </button>
      </div>
    </div>
  );
}
