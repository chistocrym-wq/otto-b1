type InstallChoice = { outcome: 'accepted' | 'dismissed'; platform?: string };

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
}

type TelegramWebApp = { initData?: string; platform?: string };

export type PwaInstallResult = 'accepted' | 'dismissed' | 'already-installed' | 'manual';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let initialized = false;
const CHANGE_EVENT = 'otto:pwa-install-change';

function notifyChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function isStandaloneApp() {
  if (typeof window === 'undefined') return false;
  const iosStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone;
}

export function canPromptInstall() {
  return deferredPrompt !== null;
}

export function initPwaInstall() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notifyChange();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notifyChange();
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }, { once: true });
  }
}

export async function requestPwaInstall(): Promise<PwaInstallResult> {
  if (isStandaloneApp()) return 'already-installed';
  if (!deferredPrompt) return 'manual';

  const prompt = deferredPrompt;
  deferredPrompt = null;
  notifyChange();

  try {
    await prompt.prompt();
    const choice = await prompt.userChoice;
    return choice.outcome === 'accepted' ? 'accepted' : 'dismissed';
  } catch {
    return 'manual';
  }
}

export function subscribePwaInstall(listener: () => void) {
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}

function isIos() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isTelegramWebView() {
  const webApp = (window as Window & { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
  if (!webApp) return false;
  return Boolean(webApp.initData) || Boolean(webApp.platform && webApp.platform !== 'unknown');
}

export function manualInstallHint(lang: 'ru' | 'de') {
  if (isTelegramWebView()) {
    return lang === 'de'
      ? 'Öffnen Sie OTTO im externen Browser und wählen Sie dort „App installieren“ oder „Zum Startbildschirm hinzufügen“.'
      : 'Откройте OTTO во внешнем браузере и выберите «Установить приложение» или «Добавить на главный экран».';
  }
  if (isIos()) {
    return lang === 'de'
      ? 'In Safari: „Teilen“ → „Zum Home-Bildschirm“ → „Hinzufügen“.'
      : 'В Safari нажмите «Поделиться» → «На экран Домой» → «Добавить».';
  }
  return lang === 'de'
    ? 'Öffnen Sie das Browsermenü und wählen Sie „App installieren“ oder „Zum Startbildschirm hinzufügen“.'
    : 'Откройте меню браузера и выберите «Установить приложение» или «Добавить на главный экран».';
}
