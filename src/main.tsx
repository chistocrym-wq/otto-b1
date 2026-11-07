import { StrictMode } from 'react';
import { v20ClientEnabled } from './lib/v20ClientFeatures';
import { createRoot } from 'react-dom/client';
import './index.css';
import './ottoPremiumSystem.css';
import './ottoPremiumVoice.css';
import './ottoReferencePalette.css';
import './ottoSupportFixes.css';
import { installGermanSpeechPolicy } from './lib/germanSpeechPolicy';
import { initPwaInstall } from './lib/pwaInstall';
import { installTextSizePreference } from './lib/textSizePreference';
import { initializeServerStateSync } from './lib/serverStateSync';

const IS_TEACHER_ROUTE = window.location.pathname === '/teacher' || window.location.pathname.startsWith('/teacher/');
const IS_ADMIN_ROUTE = window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/');
// Import only the most commonly visited shell modules on an idle desktop.
// Mobile and data-saving connections must load sections only when requested.
const routePreloaders = [
  () => import('./components/ModulesHub'),
  () => import('./components/Instructions'),
  () => import('./components/SettingsPage'),
  () => import('./components/ExamGuide'),
] as const;

function installRoutePreloadRecovery() {
  window.addEventListener('vite:preloadError', (event) => {
    // A previous Vite chunk can disappear after a deploy. Never force a reload
    // while a letter, an exam, or a microphone recording may be in progress.
    event.preventDefault();
    if (document.getElementById('otto-update-available')) return;
    const banner = document.createElement('aside');
    banner.id = 'otto-update-available';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    Object.assign(banner.style, {
      position: 'fixed', zIndex: '2147483000', left: '12px', right: '12px',
      bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
      maxWidth: '540px', margin: '0 auto', padding: '14px',
      color: '#0f172a', background: '#fff', border: '2px solid #176554',
      borderRadius: '16px', boxShadow: '0 6px 24px rgba(0,0,0,.18)',
      fontFamily: 'system-ui, sans-serif',
    });
    const message = document.createElement('p');
    message.textContent = 'Доступно обновление OTTO. Сохраните ответы и завершите запись перед обновлением.';
    message.style.margin = '0 0 10px';
    const refresh = document.createElement('button');
    refresh.type = 'button';
    refresh.textContent = 'Обновить, когда закончу';
    Object.assign(refresh.style, {
      padding: '10px 14px', minHeight: '44px', background: '#176554',
      color: 'white', borderRadius: '10px', border: '0', cursor: 'pointer',
      fontWeight: '700',
    });
    refresh.addEventListener('click', () => {
      if (window.confirm('Перед обновлением сохраните письмо, ответы и запись. Перезагрузить OTTO сейчас?')) {
        window.location.reload();
      }
    });
    banner.append(message, refresh);
    document.body.appendChild(banner);
  });

  const preloadRoutes = () => {
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    const narrowScreen = window.matchMedia('(max-width: 768px)').matches;
    const savingData = Boolean(connection?.saveData) ||
      /^(slow-2g|2g)$/.test(connection?.effectiveType || '') ||
      window.matchMedia('(prefers-reduced-data: reduce)').matches;
    if (narrowScreen || savingData || document.visibilityState === 'hidden') return;
    void Promise.allSettled(routePreloaders.map((load) => load()));
  };
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  };
  if (typeof idleWindow.requestIdleCallback === 'function') {
    idleWindow.requestIdleCallback(preloadRoutes, { timeout: 4000 });
  } else {
    window.setTimeout(preloadRoutes, 2500);
  }
}

if (!IS_ADMIN_ROUTE) {
  installGermanSpeechPolicy();
  installTextSizePreference();
  initPwaInstall();
  installRoutePreloadRecovery();
}

async function startApp() {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;
  const root = createRoot(rootElement);

  // Keep a visible initial state while loading JS and the existing state sync.
  // No protected route is mounted until the original access gates run in App.
  root.render(
    <div role="status" aria-live="polite" style={{
      minHeight: '100dvh', display: 'grid', placeItems: 'center',
      background: '#f7f1e8', color: '#0f172a', fontFamily: 'system-ui, sans-serif',
      padding: '24px', textAlign: 'center',
    }}>
      <span>Загружаем OTTO…</span>
    </div>
  );

  try {
    if (IS_TEACHER_ROUTE) {
      const { TeacherPortal } = await import('./teacher/TeacherPortal');
      root.render(<StrictMode><TeacherPortal/></StrictMode>);
      return;
    }
    if (IS_ADMIN_ROUTE) {
      if (v20ClientEnabled('admin')) {
        const { ReadableAdmin } = await import('./admin/ReadableAdmin');
        root.render(<StrictMode><ReadableAdmin /></StrictMode>);
      } else {
        const { AdminApp } = await import('./admin/AdminApp');
        root.render(<StrictMode><AdminApp /></StrictMode>);
      }
      return;
    }
    const { default: App } = await import('./App.tsx');
    await initializeServerStateSync();
    root.render(<StrictMode><App /></StrictMode>);
  } catch (error) {
    console.error('OTTO initial load failed:', error);
    root.render(
      <main role="alert" style={{
        minHeight: '100dvh', display: 'grid', placeItems: 'center',
        background: '#f7f1e8', color: '#0f172a',
        fontFamily: 'system-ui, sans-serif', padding: '24px', textAlign: 'center',
      }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', marginBottom: '12px' }}>Не удалось загрузить OTTO</h1>
          <p>Проверьте соединение и попробуйте снова. Ваш прогресс не удаляется.</p>
          <button type="button" onClick={() => window.location.reload()} style={{
            marginTop: '18px', minHeight: '48px', padding: '12px 22px',
            border: '1px solid #176554', borderRadius: '12px',
            background: 'white', color: '#176554', fontWeight: 700,
          }}>Повторить загрузку</button>
        </div>
      </main>
    );
  }
}

void startApp();