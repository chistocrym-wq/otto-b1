import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

interface PageTranslationEyeProps {
  scopeId: string;
}

function hashParts(parts: string[]) {
  let hash = 2166136261;
  const source = parts.join('\u241f');
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `otto-visible-task-ru-${(hash >>> 0).toString(16)}`;
}

function collectGermanText(scopeId: string) {
  const root = document.getElementById(scopeId);
  if (!root) return [];

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const seen = new Set<string>();
  const parts: string[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;
    if (!parent || parent.closest('[data-translation-ui]')) continue;

    const text = node.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    if (text.length < 2 || !/[A-Za-zÄÖÜäöüß]{2,}/.test(text)) continue;

    const style = window.getComputedStyle(parent);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    if (parent.getClientRects().length === 0) continue;

    if (!seen.has(text)) {
      seen.add(text);
      parts.push(text);
    }
    if (parts.length >= 40) break;
  }

  return parts;
}

function fingerprint(scopeId: string) {
  return collectGermanText(scopeId).join('\u241f');
}

export function PageTranslationEye({ scopeId }: PageTranslationEyeProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<string[]>([]);
  const [translations, setTranslations] = useState<string[]>([]);
  const [error, setError] = useState('');
  const lastFingerprint = useRef('');
  const requestRef = useRef<AbortController | null>(null);

  const clearTranslation = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    setOpen(false);
    setLoading(false);
    setSource([]);
    setTranslations([]);
    setError('');
  };

  useEffect(() => {
    const root = document.getElementById(scopeId);
    if (!root) return;

    lastFingerprint.current = fingerprint(scopeId);
    const observer = new MutationObserver(() => {
      const next = fingerprint(scopeId);
      if (next === lastFingerprint.current) return;
      lastFingerprint.current = next;
      clearTranslation();
    });

    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      requestRef.current?.abort();
    };
  }, [scopeId]);

  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }

    const parts = collectGermanText(scopeId);
    const requestFingerprint = parts.join('\u241f');
    lastFingerprint.current = requestFingerprint;
    setSource(parts);
    setOpen(true);
    setError('');

    if (!parts.length) {
      setTranslations([]);
      setError('На этом экране нет немецкого текста для перевода.');
      return;
    }

    const key = hashParts(parts);
    try {
      const cached = window.localStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length === parts.length) {
          setTranslations(parsed.map(String));
          return;
        }
      }
    } catch {
      // Ignore cache errors.
    }

    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;
    setLoading(true);
    setTranslations([]);
    try {
      const response = await fetch('/api/translate-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parts }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Не удалось открыть перевод.');
      const result = Array.isArray(payload.translations) ? payload.translations.map(String) : [];
      if (result.length !== parts.length) throw new Error('Не удалось загрузить перевод полностью. Попробуйте ещё раз.');
      if (controller.signal.aborted || lastFingerprint.current !== requestFingerprint) return;
      setTranslations(result);
      try { window.localStorage.setItem(key, JSON.stringify(result)); } catch { /* ignore */ }
    } catch (translationError) {
      if (controller.signal.aborted || lastFingerprint.current !== requestFingerprint) return;
      setError(translationError instanceof Error ? translationError.message : 'Не удалось открыть перевод.');
    } finally {
      if (!controller.signal.aborted && lastFingerprint.current === requestFingerprint) setLoading(false);
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  return (
    <div data-translation-ui className="mb-3 min-w-0 max-w-full">
      <div className="sticky top-2 z-30 flex justify-end">
        <button
          type="button"
          onClick={toggle}
          aria-label={open ? 'Скрыть русский перевод задания' : 'Показать задание по-русски'}
          title={open ? 'Скрыть русский перевод' : 'Показать задание по-русски'}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-amber-200 bg-white/95 px-3 py-2 text-sm font-bold text-amber-900 shadow-sm backdrop-blur"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : open ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {open ? 'Скрыть перевод' : 'По-русски'}
        </button>
      </div>

      {open && (
        <div className="mt-3 max-w-full overflow-x-hidden rounded-2xl border border-amber-200 bg-amber-50 p-3 shadow-sm sm:p-4">
          <p className="break-words text-xs font-black uppercase tracking-[0.14em] text-amber-800 [overflow-wrap:anywhere]">Перевод текущего задания</p>
          {loading && <p className="mt-2 text-sm text-slate-600">Перевожу…</p>}
          {error && <p className="mt-2 break-words text-sm text-rose-700 [overflow-wrap:anywhere]">{error}</p>}
          {!loading && translations.length > 0 && (
            <div className="mt-3 min-w-0 space-y-3">
              {translations.map((translation, index) => (
                <div key={`${source[index]}-${index}`} className="min-w-0 max-w-full overflow-hidden rounded-xl bg-white/80 p-3">
                  <p className="break-words text-[11px] leading-4 text-slate-400 [overflow-wrap:anywhere]">{source[index]}</p>
                  <p className="mt-1 break-words text-sm font-medium leading-6 text-slate-800 [overflow-wrap:anywhere]">{translation}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
