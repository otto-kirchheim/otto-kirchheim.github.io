import { useSyncExternalStore } from 'react';

import { isGloballyDisabled, subscribeGlobalDisable } from './globalDisableStore';

/**
 * Globaler `[data-disabler]`-Zustand, reaktiv aus dem `globalDisableStore` gelesen.
 *
 * @returns `true`, wenn die `[data-disabler]`-Buttons global deaktiviert sind.
 */
export default function useGlobalDisabled(): boolean {
  return useSyncExternalStore(subscribeGlobalDisable, isGloballyDisabled);
}
