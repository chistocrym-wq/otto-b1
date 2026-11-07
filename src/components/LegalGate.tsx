import { useState } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { LegalDocumentsModal } from '@/components/LegalDocumentsModal';
import { OttoScene } from '@/components/OttoScene';
import { LEGAL_DOCUMENT_VERSION, type LegalDocumentId } from '@/lib/legal';

interface Props {
  onAccept: () => Promise<boolean>;
  error?: string;
}

export function LegalGate({ onAccept, error = '' }: Props) {
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');
  const [documentId, setDocumentId] = useState<LegalDocumentId | null>(null);

  const accept = async () => {
    if (!checked || busy) return;
    setBusy(true);
    setLocalError('');
    const ok = await onAccept();
    if (!ok) {
      setLocalError('Не удалось сохранить согласие. Попробуйте ещё раз.');
      setBusy(false);
    }
  };

  return (
    <main className="otto-responsive-legal h-[100dvh] w-full overflow-x-hidden overflow-y-auto overscroll-contain bg-[var(--otto-bg)] px-4 py-6 text-[var(--otto-ink)] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-xl">
        <section className="overflow-hidden rounded-[30px] border border-[var(--otto-line)] bg-[var(--otto-surface)] shadow-[0_24px_70px_rgba(43,54,54,.12)]">
          <div className="grid min-h-[170px] grid-cols-[minmax(0,1fr)_minmax(84px,30%)] items-end gap-2 overflow-hidden bg-[var(--otto-petrol-soft)] px-4 pt-5 sm:gap-4 sm:px-7">
            <div className="min-w-0 pb-5">
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[.16em] text-[var(--otto-petrol-dark)]">OTTO A1</span>
              <h1 className="mt-3 text-2xl font-black leading-tight">Перед продолжением</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--otto-muted)]">Нужно один раз подтвердить актуальные юридические документы.</p>
            </div>
            <OttoScene scene="guide" className="h-[145px] w-auto max-w-full self-end justify-self-end object-contain object-bottom sm:h-[175px]"/>
          </div>

          <div className="p-5 sm:p-7">
            <div className="rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-surface-strong)] p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event)=>setChecked(event.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 accent-[var(--otto-petrol-dark)]"
                />
                <span className="text-sm leading-6 text-[var(--otto-ink)]">
                  Я даю согласие на обработку моих персональных данных по версии <b>{LEGAL_DOCUMENT_VERSION}</b>.
                </span>
              </label>

              <button
                type="button"
                onClick={()=>setDocumentId('consent')}
                className="mt-3 text-left text-sm font-bold text-[var(--otto-petrol-dark)] underline underline-offset-2"
              >
                Открыть согласие на обработку персональных данных
              </button>
            </div>

            <p className="mt-4 text-xs leading-5 text-[var(--otto-muted)]">
              Нажимая «Принять и продолжить», вы принимаете{' '}
              <button type="button" onClick={()=>setDocumentId('agreement')} className="font-bold text-[var(--otto-petrol-dark)] underline underline-offset-2">Пользовательское соглашение</button>
              {' '}и подтверждаете, что ознакомились с{' '}
              <button type="button" onClick={()=>setDocumentId('privacy')} className="font-bold text-[var(--otto-petrol-dark)] underline underline-offset-2">Политикой обработки персональных данных</button>.
            </p>

            {(localError || error) && <p role="alert" className="mt-3 text-sm font-semibold text-[var(--otto-danger)]">{localError || error}</p>}

            <button
              type="button"
              disabled={!checked || busy}
              onClick={()=>void accept()}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--otto-petrol-dark)] px-5 font-black text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              <CheckCircle2 className="h-5 w-5"/>{busy?'Сохраняем…':'Принять и продолжить'}
            </button>

            <div className="mt-4 flex items-center gap-2 text-xs leading-5 text-[var(--otto-muted)]">
              <ShieldCheck className="h-4 w-4 shrink-0"/>
              Согласие фиксируется на сервере с версией документа и серверным временем.
            </div>
          </div>
        </section>
      </div>

      {documentId && <LegalDocumentsModal documentId={documentId} onClose={()=>setDocumentId(null)}/>}
    </main>
  );
}
