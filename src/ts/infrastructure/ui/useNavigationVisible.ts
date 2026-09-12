import { useSyncExternalStore } from 'react';

import { isNavigationSichtbar, subscribeNavigationSichtbar } from './navigationVisibleStore';

/** Reaktiver Zugriff auf `navigationVisibleStore` (wie `useGlobalDisabled`). */
export default function useNavigationVisible(): boolean {
  return useSyncExternalStore(subscribeNavigationSichtbar, isNavigationSichtbar);
}
