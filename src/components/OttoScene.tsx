export type OttoSceneName = 'home' | 'guide' | 'lesen' | 'horen' | 'schreiben' | 'exam';

interface OttoSceneProps {
  scene: OttoSceneName;
  className?: string;
  label?: string;
  eager?: boolean;
}

// Each scene points at a dedicated, pre-optimized WebP (no more background-sprite hack).
// "schreiben" and "exam" intentionally reuse a close pose to keep the asset count small.
const SCENE_SRC: Record<OttoSceneName, string> = {
  home: '/otto/otto-home.webp?v=1',
  guide: '/otto/otto-guide.webp?v=1',
  lesen: '/otto/otto-lesen.webp?v=1',
  horen: '/otto/otto-horen.webp?v=1',
  schreiben: '/otto/otto-guide.webp?v=1',
  exam: '/otto/otto-home.webp?v=1',
};

export function OttoScene({ scene, className = '', label = '', eager = false }: OttoSceneProps) {
  return (
    <img
      src={SCENE_SRC[scene]}
      alt={label}
      aria-hidden={label ? undefined : true}
      className={`otto-scene otto-scene-${scene} ${className}`.trim()}
      draggable={false}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={eager ? 'high' : 'auto'}
      width={460}
      height={574}
    />
  );
}
