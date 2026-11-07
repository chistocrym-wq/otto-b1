import type { ReadingVisual } from '@/types';

interface SMSCardProps {
  visual: ReadingVisual;
}

export function SMSCard({ visual }: SMSCardProps) {
  return (
    <div className="mx-auto w-full max-w-2xl border border-slate-300 bg-white px-5 py-5 sm:px-7 sm:py-6">
      <div className="mb-4 border-b border-slate-300 pb-3">
        <div className="text-[16px] font-semibold text-slate-800 sm:text-[17px]">
          Nachricht
        </div>

        {visual.sender && (
          <div className="mt-1 text-[16px] text-slate-700 sm:text-[17px]">
            <span className="font-semibold">Von:</span>{' '}
            {visual.sender}
          </div>
        )}

        {visual.date && (
          <div className="mt-1 text-[14px] text-slate-500 sm:text-[15px]">
            {visual.date}
          </div>
        )}
      </div>

      <p className="whitespace-pre-line text-[18px] leading-8 text-slate-900 sm:text-[19px]">
        {visual.message}
      </p>
    </div>
  );
}