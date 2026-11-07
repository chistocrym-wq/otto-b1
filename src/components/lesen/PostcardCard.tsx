import type { ReadingVisual } from '@/types';

interface PostcardCardProps {
  visual: ReadingVisual;
}

export function PostcardCard({
  visual,
}: PostcardCardProps) {
  return (
    <div className="mx-auto w-full max-w-2xl border border-slate-300 bg-white p-5 sm:p-7">
      <div className="mb-6 flex items-center justify-between border-b border-slate-300 pb-4">
        <div className="text-[17px] font-semibold text-slate-800 sm:text-[18px]">
          Postkarte
        </div>

        <div className="h-12 w-16 border border-slate-300 bg-slate-50">
          <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
            BRIEF
          </div>
        </div>
      </div>

      {visual.title && (
        <div className="mb-5 text-[18px] font-semibold text-slate-900 sm:text-[19px]">
          {visual.title}
        </div>
      )}

      <p className="whitespace-pre-line text-[18px] leading-8 text-slate-900 sm:text-[19px]">
        {visual.message}
      </p>
    </div>
  );
}