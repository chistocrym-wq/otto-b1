export type TextSizePreference = 'small' | 'medium' | 'large';

const STORAGE_KEY = 'otto-text-size-v1';

export const TEXT_SIZE_FACTORS: Record<TextSizePreference, number> = {
  small: 0.9,
  medium: 1,
  large: 1.18,
};

type OriginalInlineTextStyle = {
  fontSize: string;
  fontSizePriority: string;
  lineHeight: string;
  lineHeightPriority: string;
};

const originals = new WeakMap<HTMLElement, OriginalInlineTextStyle>();
const touched = new Set<HTMLElement>();
const subscribers = new Set<() => void>();

let current: TextSizePreference = readTextSizePreference();
let observer: MutationObserver | null = null;
let frame = 0;
let installed = false;

function isPreference(value: string | null): value is TextSizePreference {
  return value === 'small' || value === 'medium' || value === 'large';
}

export function readTextSizePreference(): TextSizePreference {
  if (typeof window === 'undefined') return 'medium';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isPreference(stored) ? stored : 'medium';
  } catch {
    return 'medium';
  }
}

function hasOwnVisibleText(element: HTMLElement) {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLButtonElement
  ) return true;

  return Array.from(element.childNodes).some(
    (node) => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()),
  );
}

function isScalableTextElement(element: HTMLElement) {
  const tag = element.tagName;
  if (
    tag === 'SCRIPT' ||
    tag === 'STYLE' ||
    tag === 'NOSCRIPT' ||
    tag === 'IMG' ||
    tag === 'PICTURE' ||
    tag === 'VIDEO' ||
    tag === 'AUDIO' ||
    tag === 'CANVAS' ||
    tag === 'SVG' ||
    tag === 'PATH' ||
    tag === 'BR' ||
    tag === 'HR'
  ) return false;

  return hasOwnVisibleText(element);
}

function rememberInlineStyle(element: HTMLElement) {
  if (originals.has(element)) return;
  originals.set(element, {
    fontSize: element.style.getPropertyValue('font-size'),
    fontSizePriority: element.style.getPropertyPriority('font-size'),
    lineHeight: element.style.getPropertyValue('line-height'),
    lineHeightPriority: element.style.getPropertyPriority('line-height'),
  });
}

function restoreElement(element: HTMLElement) {
  const original = originals.get(element);
  if (!original) return;

  if (original.fontSize) {
    element.style.setProperty('font-size', original.fontSize, original.fontSizePriority);
  } else {
    element.style.removeProperty('font-size');
  }

  if (original.lineHeight) {
    element.style.setProperty('line-height', original.lineHeight, original.lineHeightPriority);
  } else {
    element.style.removeProperty('line-height');
  }
}

function restoreTouchedElements() {
  for (const element of touched) {
    if (element.isConnected) restoreElement(element);
  }
  touched.clear();
}

function measureTextElements() {
  if (!document.body) return [] as Array<{ element: HTMLElement; fontSize: number; lineHeight: number | null }>;

  const elements = [document.body, ...Array.from(document.body.querySelectorAll<HTMLElement>('*'))]
    .filter(isScalableTextElement);

  return elements.map((element) => {
    const style = window.getComputedStyle(element);
    const fontSize = Number.parseFloat(style.fontSize);
    const lineHeight = style.lineHeight === 'normal' ? null : Number.parseFloat(style.lineHeight);
    return {
      element,
      fontSize: Number.isFinite(fontSize) ? fontSize : 0,
      lineHeight: lineHeight !== null && Number.isFinite(lineHeight) ? lineHeight : null,
    };
  });
}

function applyCurrentPreference() {
  if (typeof document === 'undefined') return;
  restoreTouchedElements();

  document.documentElement.dataset.ottoTextSize = current;

  const factor = TEXT_SIZE_FACTORS[current];
  if (factor === 1) return;

  // Two-pass application is intentional: all medium/base computed values are
  // measured before any scaled inline font-size is written, preventing nested
  // text elements from multiplying the scale more than once.
  const measurements = measureTextElements();

  for (const { element, fontSize, lineHeight } of measurements) {
    if (fontSize <= 0) continue;
    rememberInlineStyle(element);
    element.style.setProperty('font-size', `${(fontSize * factor).toFixed(3)}px`, 'important');
    if (lineHeight !== null && lineHeight > 0) {
      element.style.setProperty('line-height', `${(lineHeight * factor).toFixed(3)}px`, 'important');
    }
    touched.add(element);
  }
}

function scheduleApply() {
  if (typeof window === 'undefined') return;
  if (frame) window.cancelAnimationFrame(frame);
  frame = window.requestAnimationFrame(() => {
    frame = 0;
    applyCurrentPreference();
  });
}

export function setTextSizePreference(next: TextSizePreference) {
  if (next === current) return;
  current = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Keep the preference active for the current session when storage is unavailable.
  }
  scheduleApply();
  subscribers.forEach((listener) => listener());
}

export function getTextSizePreference() {
  return current;
}

export function subscribeTextSizePreference(listener: () => void) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

export function installTextSizePreference() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;
  current = readTextSizePreference();
  document.documentElement.dataset.ottoTextSize = current;

  observer = new MutationObserver((records) => {
    if (records.some((record) => record.type === 'childList' || record.attributeName === 'class')) scheduleApply();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });

  window.addEventListener('resize', scheduleApply);
  window.visualViewport?.addEventListener('resize', scheduleApply);
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY || !isPreference(event.newValue) || event.newValue === current) return;
    current = event.newValue;
    scheduleApply();
    subscribers.forEach((listener) => listener());
  });

  scheduleApply();
}
