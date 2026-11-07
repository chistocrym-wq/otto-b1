import { useEffect, useState } from 'react';
import { OttoScene } from '@/components/OttoScene';

type SplashPhase = 'background' | 'figure' | 'leaving';

export function OttoSplash() {
  const [active, setActive] = useState(true);
  const [phase, setPhase] = useState<SplashPhase>('background');

  useEffect(() => {
    const showOttoTimer = window.setTimeout(() => setPhase('figure'), 200);
    const leaveTimer = window.setTimeout(() => setPhase('leaving'), 1400);
    const finishTimer = window.setTimeout(() => setActive(false), 2600);

    return () => {
      window.clearTimeout(showOttoTimer);
      window.clearTimeout(leaveTimer);
      window.clearTimeout(finishTimer);
    };
  }, []);

  if (!active) return null;

  return (
    <div className={`otto-splash-screen is-${phase}`} aria-hidden="true">
      <div className="otto-splash-glow" />
      <div className="otto-splash-figure">
        <div className="otto-splash-bust">
          <OttoScene scene="home" className="otto-splash-otto" eager />
        </div>
        <div className="otto-splash-brand">
          <strong>Тренажёр Отто</strong>
          <i />
          <span>Спокойный путь к сертификату A1</span>
        </div>
      </div>
    </div>
  );
}
