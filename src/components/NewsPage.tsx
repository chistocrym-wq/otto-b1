import { Newspaper } from 'lucide-react';

interface Props { onBack: () => void }

export function NewsPage({ onBack }: Props) {
  return (
    <div className="animate-fade-in pb-28">
      <div className="otto-sticky-head">
        <button type="button" onClick={onBack} aria-label="Назад" className="otto-back-button">←</button>
        <div><p className="otto-kicker">Новости OTTO</p><h1 className="text-2xl font-black text-slate-950">Что нового в тренажёре</h1></div>
      </div>
      <section className="otto-page-hero mt-4">
        <div><h2 className="text-2xl font-black text-slate-950">OTTO развивается вместе с вами</h2><p className="mt-2 text-sm text-slate-600">Здесь будут появляться новые задания, материалы и обновления тренажёра.</p></div>
        <span className="otto-news-icon"><Newspaper /></span>
      </section>
    </div>
  );
}
