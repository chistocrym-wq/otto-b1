import type { LesenTeil2Option } from '@/types';

interface Teil2OptionCardProps {
  option: LesenTeil2Option;
  label: 'A' | 'B';
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
}

export function Teil2OptionCard({
  option,
  label,
  selected,
  onClick,
  disabled,
}: Teil2OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left transition-all ${
        selected
          ? 'ring-2 ring-teal-600'
          : 'hover:ring-1 hover:ring-slate-300'
      }`}
    >
      <div className="border border-slate-400 bg-white">
        <div className="border-b border-slate-300 bg-slate-50 px-4 py-3">
          <div className="text-[18px] font-bold text-slate-900">
            {label}
          </div>
        </div>

        <div className="px-5 py-5">
          <div className="mb-3 text-[18px] font-semibold leading-7 text-slate-900">
            {option.title}
          </div>

          <p className="whitespace-pre-line text-[18px] leading-8 text-slate-900">
            {option.text}
          </p>
        </div>
      </div>
    </button>
  );
}