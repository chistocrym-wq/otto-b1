import { useSyncExternalStore } from 'react';
import {
  getTextSizePreference,
  setTextSizePreference,
  subscribeTextSizePreference,
  type TextSizePreference,
} from '@/lib/textSizePreference';

export function useTextSizePreference() {
  const textSize = useSyncExternalStore(
    subscribeTextSizePreference,
    getTextSizePreference,
    () => 'medium' as TextSizePreference,
  );

  return { textSize, setTextSize: setTextSizePreference };
}
