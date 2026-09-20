import { useSyncExternalStore } from 'react';

import { getFeatureTabsVisible, subscribeFeatureTabsVisible } from './featureTabsStore';

/**
 * Reaktiver Zugriff auf `featureTabsStore`.
 *
 * @returns `nav(navId)`: Nav-Eintrag sichtbar (vor dem ersten Setzen: ja); `quick(navId)`: Schnellzugriff sichtbar (vor dem ersten Setzen: nein).
 */
export default function useFeatureTabsVisible(): {
  nav: (navId: string) => boolean;
  quick: (navId: string) => boolean;
} {
  const sichtbar = useSyncExternalStore(subscribeFeatureTabsVisible, getFeatureTabsVisible);
  return {
    nav: navId => sichtbar === null || sichtbar.has(navId),
    quick: navId => sichtbar !== null && sichtbar.has(navId),
  };
}
