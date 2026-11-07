import { X } from 'lucide-react';
import type { LegalDocumentId } from '@/lib/legal';
import { LEGAL_DOCUMENTS } from '@/legal';

interface Props {
  documentId: LegalDocumentId;
  onClose: () => void;
}

export function LegalDocumentsModal({ documentId, onClose }: Props) {
  const document = LEGAL_DOCUMENTS[documentId];

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/45 p-3 sm:p-6" role="presentation">
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-[26px] border border-[var(--otto-line)] bg-[var(--otto-surface)] shadow-[0_28px_90px_rgba(15,23,42,.3)]" role="dialog" aria-modal="true" aria-labelledby="otto-legal-title">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--otto-line)] px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[.14em] text-[var(--otto-petrol-dark)]">OTTO A1 · {document.version}</p>
            <h2 id="otto-legal-title" className="mt-1 text-xl font-black leading-tight text-[var(--otto-ink)] sm:text-2xl">{document.title}</h2>
            <p className="mt-1 text-xs text-[var(--otto-muted)]">Действует с {document.effectiveDate}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Закрыть документ" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--otto-line)] bg-[var(--otto-surface)] text-[var(--otto-muted)]"><X className="h-5 w-5"/></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6">
          <div className="space-y-6">
            {document.sections.map((section) => (
              <section key={section.heading}>
                <h3 className="text-base font-black text-[var(--otto-ink)]">{section.heading}</h3>
                <div className="mt-2 space-y-2 text-sm leading-6 text-[var(--otto-muted)]">
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {section.bullets && <ul className="list-disc space-y-1 pl-5">{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul>}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="border-t border-[var(--otto-line)] p-4 sm:px-6">
          <button type="button" onClick={onClose} className="min-h-12 w-full rounded-xl bg-[var(--otto-petrol-dark)] px-5 font-black text-white">Закрыть</button>
        </div>
      </div>
    </div>
  );
}
