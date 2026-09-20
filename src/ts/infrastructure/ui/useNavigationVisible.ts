import { useSyncExternalStore } from 'react';

import { isNavigationSichtbar, subscribeNavigationSichtbar } from './navigationVisibleStore';

/**
 * Reaktiver Zugriff auf `navigationVisibleStore` (wie `useGlobalDisabled`).
 *
 * @returns `true`, wenn die Hauptnavigation sichtbar sein soll.
 */
export default function useNavigationVisible(): boolean {
  return useSyncExternalStore(subscribeNavigationSichtbar, isNavigationSichtbar);
}
