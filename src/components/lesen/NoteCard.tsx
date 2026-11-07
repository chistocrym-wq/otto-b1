import type { ReadingVisual } from '@/types';

interface NoteCardProps {
  visual: ReadingVisual;
}

export function NoteCard({ visual }: NoteCardProps) {
  return (
    <div className="mx-auto w-full max-w-2xl border border-slate-300 bg-white px-5 py-6 sm:px-7 sm:py-7">
      {visual.title && (
        <div className="mb-5 text-[18px] font-semibold text-slate-900 sm:text-[19px]">
          {visual.title}
        </div>
      )}

      <p className="whitespace-pre-line text-[18px] leading-8 text-slate-900 sm:text-[19px]">
        {visual.message}
      </p>

      {visual.signature && (
        <div className="mt-6 text-[16px] text-slate-700 sm:text-[17px]">
          {visual.signature}
        </div>
      )}
    </div>
  );
}