import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max: number;
  className?: string;
}

export function ProgressBar({ value, max, className }: ProgressBarProps) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className={cn('h-2.5 w-full overflow-hidden rounded-full bg-slate-200/90', className)}>
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{ width: `${percent}%`, background: 'linear-gradient(90deg, #23AEF1 0%, #1289E8 55%, #076CD4 100%)' }}
      />
    </div>
  );
}
