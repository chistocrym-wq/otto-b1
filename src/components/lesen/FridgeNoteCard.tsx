import type { ReadingVisual } from '@/types';

interface FridgeNoteCardProps {
  visual: ReadingVisual;
}

export function FridgeNoteCard({
  visual,
}: FridgeNoteCardProps) {
  return (
    <div className="mx-auto w-full max-w-2xl border border-slate-300 bg-white">
      <div className="border-b border-slate-300 bg-slate-50 px-5 py-3 text-[15px] font-medium text-slate-600 sm:px-7">
        Notiz am Kühlschrank
      </div>

      <div className="px-5 py-6 sm:px-7 sm:py-7">
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
    </div>
  );
}