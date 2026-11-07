export type OttoProductMode = 'basic' | 'full';

export function getOttoProductMode(): OttoProductMode {
  return import.meta.env.VITE_OTTO_PRODUCT_MODE === 'basic' ? 'basic' : 'full';
}

export const PRODUCT_MODE_DESCRIPTIONS = {
  basic: 'Самостоятельная тренировка по четырём экзаменационным разделам.',
  full: 'Персональный маршрут, рекомендации, проверка с Отто и оценка готовности к экзамену.',
} as const;
