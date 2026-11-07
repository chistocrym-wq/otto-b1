import { ArrowRight, BookOpen } from 'lucide-react';
import { OttoScene } from '@/components/OttoScene';

const SESSION_WELCOME_PREFIX = 'otto-reference-entry-welcome-v1:';

function welcomeKey(userId?: string): string {
  return SESSION_WELCOME_PREFIX + (userId || 'authenticated');
}

/** UI-only state for the current authenticated browser session. No server/progress writes. */
export function hasSeenReferenceEntryWelcome(userId?: string): boolean {
  try {
    return window.sessionStorage.getItem(welcomeKey(userId)) === '1';
  } catch {
    return false;
  }
}

export function markReferenceEntryWelcomeSeen(userId?: string): void {
  try {
    window.sessionStorage.setItem(welcomeKey(userId), '1');
  } catch {
    // Keep navigation available when sessionStorage is blocked by a webview.
  }
}

export function clearReferenceEntryWelcomeForLogout(userId?: string): void {
  try {
    window.sessionStorage.removeItem(welcomeKey(userId));
  } catch {
    // Logout itself must remain unaffected.
  }
}

export function OttoReferenceEntryWelcome({ onReference, onLater }: { onReference: () => void; onLater: () => void }) {
  return (
    <main className="otto-reference-entry-welcome telegram-app otto-skin" aria-label="Знакомство со Справочником OTTO">
      <div className="otto-reference-entry-container">
        <section className="otto-reference-entry-panel">
          <div className="otto-reference-entry-hero">
            <div className="otto-reference-entry-copy">
              <p className="otto-kicker">OTTO</p>
              <h1 className="otto-reference-entry-title">Справочник OTTO</h1>
              <p className="otto-reference-entry-subtitle">Goethe A1 · всегда под рукой</p>
            </div>
            <div className="otto-reference-entry-illustration">
              <OttoScene scene="guide" eager className="h-full w-full object-contain"/>
            </div>
          </div>
          <p className="otto-reference-entry-description">
            Информация, с которой готовиться к экзамену станет легко и просто.
          </p>
          <aside className="otto-reference-entry-tip" aria-label="Подсказка OTTO о Справочнике">
            <span className="otto-reference-entry-tip-icon"><BookOpen className="h-5 w-5" aria-hidden="true"/></span>
            <div className="min-w-0">
              <strong>Справочник</strong>
              <p>Если вы никогда раньше не изучали немецкий язык, то вам обязательно нужно прочитать этот раздел. Информация, представленная здесь, станет отправной точкой в вашем недолгом пути до сертификата А1 по немецкому языку. Мы сознательно будем упрощать некоторые вещи, а какие-то правила и вовсе игнорировать, потому что это позволяет сделать формат экзамена А1.</p>
            </div>
          </aside>
          <div className="otto-reference-entry-actions">
            <button type="button" onClick={onReference} className="otto-reference-entry-continue">
              К справочнику <ArrowRight className="h-5 w-5" aria-hidden="true"/>
            </button>
            <button type="button" onClick={onLater} className="otto-reference-entry-later">
              Посмотреть позже
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
