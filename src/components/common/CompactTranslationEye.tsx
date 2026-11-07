import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, EyeOff, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type DesktopPanelPosition={left:number;top?:number;bottom?:number;width:number};

interface Props {
  parts: string[];
  translations?: string[];
  className?: string;
  title?: string;
}

function keyFor(parts: string[]) {
  let h = 2166136261;
  for (const ch of parts.join('|')) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return `otto-eye-${(h >>> 0).toString(16)}`;
}

function readCached(key: string, expectedLength: number) {
  try {
    const value = localStorage.getItem(key);
    if (!value) return null;
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.length === expectedLength ? parsed.map(String) : null;
  } catch {
    return null;
  }
}

export function CompactTranslationEye({ parts, translations: preset, className, title = 'Перевод' }: Props) {
  const clean = parts.map(String).map((v) => v.trim()).filter(Boolean);
  const key = keyFor(clean);
  const presetKey = preset && preset.length === clean.length ? JSON.stringify(preset.map(String)) : '';
  const validPreset = useMemo<string[] | null>(() => presetKey ? JSON.parse(presetKey) as string[] : null, [presetKey]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [translations, setTranslations] = useState<string[] | null>(() => validPreset || readCached(key, clean.length));
  const [desktopPosition, setDesktopPosition] = useState<DesktopPanelPosition | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const sourceKeyRef = useRef(key);

  useEffect(() => {
    sourceKeyRef.current = key;
    requestRef.current?.abort();
    requestRef.current = null;
    setOpen(false);
    setLoading(false);
    setError('');
    setTranslations(validPreset || readCached(key, clean.length));
    return () => requestRef.current?.abort();
  }, [key, presetKey, validPreset, clean.length]);

  const load = async () => {
    if (translations || loading || !clean.length) return;
    const requestKey = key;
    const requestParts = [...clean];
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/translate-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parts: requestParts }),
        signal: controller.signal,
      });
      const p = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(p.error || 'Не удалось открыть перевод. Попробуйте ещё раз.');
      const t = Array.isArray(p.translations) ? p.translations.map(String) : [];
      if (t.length !== requestParts.length) throw new Error('Не удалось загрузить перевод полностью. Попробуйте ещё раз.');
      if (controller.signal.aborted || sourceKeyRef.current !== requestKey) return;
      setTranslations(t);
      try { localStorage.setItem(requestKey, JSON.stringify(t)); } catch { /* ignore */ }
    } catch (e) {
      if (controller.signal.aborted || sourceKeyRef.current !== requestKey) return;
      setError(e instanceof Error ? e.message : 'Не удалось открыть перевод. Попробуйте ещё раз.');
    } finally {
      if (!controller.signal.aborted && sourceKeyRef.current === requestKey) setLoading(false);
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    void load();
  };

  const translationContent = (
    <>
      {loading && <p>Перевожу…</p>}
      {error && <p className="break-words text-rose-700 [overflow-wrap:anywhere]">{error}</p>}
      {translations?.map((t, i) => <p key={`${key}-${i}`} className={cn('break-words [overflow-wrap:anywhere]', i ? 'mt-1' : '')}>{t}</p>)}
    </>
  );

  useEffect(() => {
    if (!open || typeof window === 'undefined') {
      setDesktopPosition(null);
      return;
    }
    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const edge = 16;
      const width = Math.min(360, Math.max(300, window.innerWidth - edge * 2));
      const left = Math.min(
        Math.max(edge, rect.right - width),
        Math.max(edge, window.innerWidth - width - edge),
      );
      const placeAbove = window.innerHeight - rect.bottom < 190 && rect.top > 190;
      setDesktopPosition(
        placeAbove
          ? { left, bottom: window.innerHeight - rect.top + 8, width }
          : { left, top: rect.bottom + 8, width },
      );
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  const mobilePanel = open && typeof document !== 'undefined'
    ? createPortal(
        <div className="fixed inset-x-3 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[80] flex max-h-[34dvh] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left text-sm leading-6 text-slate-600 shadow-xl sm:hidden" data-translation-ui>
          <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
            <span className="min-w-0 break-words text-xs font-black uppercase tracking-wider text-slate-500 [overflow-wrap:anywhere]">{title}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Закрыть перевод" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain pr-1">
            {translationContent}
          </div>
        </div>,
        document.body,
      )
    : null;

  const desktopPanel = open && desktopPosition && typeof document !== 'undefined'
    ? createPortal(
        <div
          className="fixed z-[85] hidden max-h-[280px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 text-left text-sm leading-6 text-slate-700 shadow-[0_18px_50px_rgba(15,23,42,.16)] sm:block"
          style={desktopPosition}
          data-translation-ui
        >
          <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">{title}</p>
          <div className="min-w-0 whitespace-normal">{translationContent}</div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className={cn('relative min-w-0 shrink-0 text-right', className)} data-translation-ui>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-label={open ? 'Скрыть перевод' : 'Показать перевод'}
        title={open ? 'Скрыть перевод' : 'Показать перевод'}
        className={cn(
          'inline-flex h-10 w-10 items-center justify-center rounded-xl border transition',
          open ? 'border-slate-300 bg-white text-teal-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
        )}
      >
        {open ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>

      {desktopPanel}
      {mobilePanel}
    </div>
  );
}
