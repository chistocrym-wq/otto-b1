import { Undo2 } from 'lucide-react';
import { DraggableModeAction } from '@/components/DraggableModeAction';

interface Props {
  onClick: () => void;
}

export function TrainingResumeButton({ onClick }: Props) {
  return (
    <div className="otto-training-resume-slot mb-3 flex w-full justify-center px-2 sm:mb-4">
      <DraggableModeAction
        storageKey="resume"
        onClick={onClick}
        className="inline-flex min-h-12 max-w-full items-center justify-center gap-2 rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-surface)] px-5 text-sm font-[850] text-[var(--otto-petrol-dark)] shadow-[0_12px_32px_rgba(16,42,58,.16)]"
      >
        <Undo2 className="h-4 w-4 shrink-0" />
        <span>Вернуться к тренировке</span>
      </DraggableModeAction>
    </div>
  );
}
