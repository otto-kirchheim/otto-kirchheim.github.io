import { useSyncExternalStore } from 'react';

import { isGloballyDisabled, subscribeGlobalDisable } from './globalDisableStore';

/** Globaler `[data-disabler]`-Zustand, reaktiv aus dem `globalDisableStore` gelesen. */
export default function useGlobalDisabled(): boolean {
  return useSyncExternalStore(subscribeGlobalDisable, isGloballyDisabled);
}
