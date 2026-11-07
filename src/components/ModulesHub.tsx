import { BookOpen, Headphones, Mic, PenTool } from 'lucide-react';
import type { ModuleId, Progress } from '@/types';
import { ProgressBar } from '@/components/ProgressBar';
import { OttoScene } from '@/components/OttoScene';

interface Props {
  progress: Progress;
  onSelectModule: (module: ModuleId) => void;
}

const modules = [
  { id: 'lesen' as ModuleId, title: 'Lesen', subtitle: 'Чтение', desc: 'Тексты, объявления и короткие сообщения.', icon: BookOpen },
  { id: 'horen' as ModuleId, title: 'Hören', subtitle: 'Аудирование', desc: 'Диалоги, объявления, время и числа.', icon: Headphones },
  { id: 'schreiben' as ModuleId, title: 'Schreiben', subtitle: 'Письмо', desc: 'Формуляры, письма и короткие сообщения.', icon: PenTool },
  { id: 'sprechen' as ModuleId, title: 'Sprechen', subtitle: 'Говорение', desc: 'Представление, вопросы и просьбы.', icon: Mic },
];

export function ModulesHub({ progress, onSelectModule }: Props) {
  return (
    <div className="otto-hub-screen animate-fade-in">
      <section className="otto-page-hero">
        <div>
          <p className="otto-kicker">Учебные модули</p>
          <h1>Выберите раздел и продолжайте подготовку</h1>
        </div>
        <div className="otto-page-hero-character" aria-hidden="true">
          <OttoScene scene="guide" className="otto-page-hero-scene" />
        </div>
      </section>

      <section className="otto-module-list">
        {modules.map(({ id, title, subtitle, desc, icon: Icon }) => {
          const item = progress[id];
          const answered = item?.answered ?? 0;
          const correct = item?.correct ?? 0;
          const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
          return (
            <button key={id} type="button" onClick={() => onSelectModule(id)} className="otto-module-row">
              <span className="otto-module-row-icon"><Icon /></span>
              <span className="min-w-0 flex-1 text-left">
                <strong>{title}</strong>
                <small>{subtitle}</small>
                <span className="otto-module-row-desc">{desc}</span>
              </span>
              <span className="otto-module-progress w-28 shrink-0 sm:w-36">
                <span className="mb-1 flex items-center justify-between text-xs font-bold text-slate-500"><span>{answered}</span><span>{accuracy}%</span></span>
                <ProgressBar value={accuracy} max={100} />
              </span>
            </button>
          );
        })}
      </section>
    </div>
  );
}
