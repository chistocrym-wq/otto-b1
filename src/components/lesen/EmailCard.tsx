import type { ReadingVisual } from '@/types';

interface EmailCardProps {
  visual: ReadingVisual;
}

export function EmailCard({ visual }: EmailCardProps) {
  return (
    <div className="mx-auto w-full max-w-2xl border border-slate-300 bg-white">
      <div className="border-b border-slate-300 px-5 py-5 sm:px-7">
        <div className="mb-4 text-[17px] font-semibold text-slate-800">
          E-Mail
        </div>

        <div className="space-y-1 text-[16px] leading-6 text-slate-700 sm:text-[17px]">
          {visual.sender && (
            <div>
              <span className="font-semibold">Von:</span>{' '}
              {visual.sender}
            </div>
          )}

          {visual.recipient && (
            <div>
              <span className="font-semibold">An:</span>{' '}
              {visual.recipient}
            </div>
          )}

          {visual.subject && (
            <div>
              <span className="font-semibold">Betreff:</span>{' '}
              {visual.subject}
            </div>
          )}

          {visual.date && (
            <div className="pt-1 text-[14px] text-slate-500">
              {visual.date}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-6 sm:px-7 sm:py-7">
        <p className="whitespace-pre-line text-[18px] leading-8 text-slate-900 sm:text-[19px]">
          {visual.body}
        </p>
      </div>
    </div>
  );
}