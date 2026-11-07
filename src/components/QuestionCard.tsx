import { useState } from 'react';
import { Check, X, ChevronRight } from 'lucide-react';
import type { MultipleChoiceQuestion, TrueFalseQuestion } from '@/types';
import { cn } from '@/lib/utils';

interface QuestionCardProps {
  question: MultipleChoiceQuestion | TrueFalseQuestion;
  index: number;
  onAnswer: (correct: boolean) => void;
  showResult: boolean;
}

export function QuestionCard({ question, index, onAnswer, showResult }: QuestionCardProps) {
  const [selected, setSelected] = useState<number | boolean | null>(null);
  const [answered, setAnswered] = useState(false);

  const handleSelect = (value: number | boolean) => {
    if (answered) return;
    setSelected(value);
    setAnswered(true);

    let correct: boolean;
    if (question.type === 'multiple-choice') {
      correct = value === (question as MultipleChoiceQuestion).correctIndex;
    } else {
      correct = value === (question as TrueFalseQuestion).correctAnswer;
    }
    onAnswer(correct);
  };

  return (
    <div className="animate-slide-up rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-semibold text-sm shrink-0">
          {index + 1}
        </span>
        <p className="text-slate-900 font-medium pt-0.5">{question.prompt}</p>
      </div>

      {question.type === 'multiple-choice' ? (
        <div className="space-y-2.5 ml-11">
          {(question as MultipleChoiceQuestion).options.map((option, i) => {
            const isCorrect = i === (question as MultipleChoiceQuestion).correctIndex;
            const isSelected = selected === i;
            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={answered}
                className={cn(
                  'flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-200',
                  !answered && 'border-slate-200 hover:border-teal-400 hover:bg-teal-50 cursor-pointer',
                  answered && isCorrect && 'border-emerald-400 bg-emerald-50',
                  answered && isSelected && !isCorrect && 'border-rose-400 bg-rose-50',
                  answered && !isCorrect && !isSelected && 'border-slate-200 opacity-60'
                )}
              >
                <span className={cn(
                  'flex items-center justify-center w-6 h-6 rounded-full border-2 text-xs font-bold shrink-0',
                  !answered && 'border-slate-300 text-slate-400',
                  answered && isCorrect && 'border-emerald-500 bg-emerald-500 text-white',
                  answered && isSelected && !isCorrect && 'border-rose-500 bg-rose-500 text-white',
                  answered && !isCorrect && !isSelected && 'border-slate-300 text-slate-300'
                )}>
                  {answered && isCorrect ? <Check className="w-3.5 h-3.5" /> :
                   answered && isSelected && !isCorrect ? <X className="w-3.5 h-3.5" /> :
                   String.fromCharCode(65 + i)}
                </span>
                <span className="text-slate-800">{option}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex gap-3 ml-11">
          {[
            { label: 'Richtig', value: true },
            { label: 'Falsch', value: false },
          ].map((opt) => {
            const isCorrect = opt.value === (question as TrueFalseQuestion).correctAnswer;
            const isSelected = selected === opt.value;
            return (
              <button
                key={String(opt.value)}
                onClick={() => handleSelect(opt.value)}
                disabled={answered}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 rounded-xl border-2 font-medium transition-all duration-200',
                  !answered && 'border-slate-200 hover:border-teal-400 hover:bg-teal-50 cursor-pointer',
                  answered && isCorrect && 'border-emerald-400 bg-emerald-50 text-emerald-700',
                  answered && isSelected && !isCorrect && 'border-rose-400 bg-rose-50 text-rose-700',
                  answered && !isCorrect && !isSelected && 'border-slate-200 opacity-60 text-slate-400'
                )}
              >
                {answered && isCorrect && <Check className="w-4 h-4" />}
                {answered && isSelected && !isCorrect && <X className="w-4 h-4" />}
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {answered && question.explanation && showResult && (
        <div className="ml-11 mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 animate-fade-in">
          <div className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <p className="text-sm text-slate-600">{question.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
}
