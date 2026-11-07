import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TranslationEyeProps {
  parts: string[];
  title?: string;
  labels?: string[];
  className?: string;
}

function cacheKey(parts: string[]) {
  let hash = 2166136261;
  const source = parts.join('\u241f');
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `otto-task-ru-${(hash >>> 0).toString(16)}`;
}

function cachedTranslation(key: string, expectedLength: number) {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(key);
    if (!value) return null;
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.length === expectedLength ? parsed.map(String) : null;
  } catch {
    return null;
  }
}

export function TranslationEye({ parts, title = 'Перевод задания', labels, className }: TranslationEyeProps) {
  const cleanParts = useMemo(() => parts.map((part) => String(part || '').trim()).filter(Boolean), [parts]);
  const key = useMemo(() => cacheKey(cleanParts), [cleanParts]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [translations, setTranslations] = useState<string[] | null>(() => cachedTranslation(key, cleanParts.length));
  const [error, setError] = useState('');
  const requestRef = useRef<AbortController | null>(null);
  const sourceKeyRef = useRef(key);

  useEffect(() => {
    sourceKeyRef.current = key;
    requestRef.current?.abort();
    requestRef.current = null;
    setOpen(false);
    setLoading(false);
    setError('');
    setTranslations(cachedTranslation(key, cleanParts.length));
    return () => requestRef.current?.abort();
  }, [key, cleanParts.length]);

  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (translations || !cleanParts.length || loading) return;

    const requestKey = key;
    const requestParts = [...cleanParts];
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/translate-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parts: requestParts }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Не удалось получить перевод.');
      const result = Array.isArray(payload.translations) ? payload.translations.map(String) : [];
      if (result.length !== requestParts.length) throw new Error('Не удалось загрузить перевод полностью. Попробуйте ещё раз.');
      if (controller.signal.aborted || sourceKeyRef.current !== requestKey) return;
      setTranslations(result);
      try { window.localStorage.setItem(requestKey, JSON.stringify(result)); } catch { /* ignore */ }
    } catch (translationError) {
      if (controller.signal.aborted || sourceKeyRef.current !== requestKey) return;
      setError(translationError instanceof Error ? translationError.message : 'Не удалось получить перевод.');
    } finally {
      if (!controller.signal.aborted && sourceKeyRef.current === requestKey) setLoading(false);
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  return (
    <div className={cn('min-w-0 w-full max-w-full', className)} data-translation-ui>
      <button
        type="button"
        onClick={toggle}
        title={open ? 'Скрыть русский перевод' : 'Показать по-русски'}
        aria-label={open ? 'Скрыть русский перевод' : 'Показать по-русски'}
        className={cn(
          'inline-flex min-h-[40px] items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition',
          open ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        )}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : open ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        {open ? 'Скрыть перевод' : 'По-русски'}
      </button>

      {open && (
        <div className="mt-3 max-w-full overflow-hidden rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-slate-700">
          <p className="mb-2 break-words text-xs font-black uppercase tracking-[0.14em] text-amber-800 [overflow-wrap:anywhere]">{title}</p>
          {loading && <p>Перевожу…</p>}
          {error && <p className="break-words text-rose-700 [overflow-wrap:anywhere]">{error}</p>}
          {translations && !loading && (
            <div className="min-w-0 space-y-2">
              {translations.map((translation, index) => (
                <p key={`${key}-${index}`} className="break-words [overflow-wrap:anywhere]">
                  {labels?.[index] ? <span className="font-bold text-slate-900">{labels[index]} </span> : null}
                  {translation}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
