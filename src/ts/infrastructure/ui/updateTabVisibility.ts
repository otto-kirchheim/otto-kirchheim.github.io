import { featureRegistry } from '@/core/hooks';
import { setFeatureTabsVisible } from './featureTabsStore';
import { flushExtern } from './reactRoot';

/**
 * Zeigt/Versteckt Feature-Tabs (Nav-Eintrag und Start-Schnellzugriff gemeinsam) basierend auf `aktivierteTabs`.
 * Wenn `aktivierteTabs` leer oder nicht gesetzt ist, werden nur die Features mit `legacyDefaultOn` angezeigt
 * (deckungsgleich mit `syncFeatureTabs.ts`; EA fehlt bewusst: ohne explizites `ea` wird das Feature nicht gemountet).
 * Schreibt in `featureTabsStore`; `AppHeader.tsx` und `StartTab.tsx` rendern daraus.
 *
 * @param aktivierteTabs - Werte aus `meta.legacy.tabKey` (`bereitschaft`, `ewt`, `neben`, `ea`); unbekannte werden ignoriert.
 */
export default function updateTabVisibility(aktivierteTabs?: string[]): void {
  const useDefaults = !aktivierteTabs || aktivierteTabs.length === 0;

  const navIds = featureRegistry
    .metas()
    .filter(meta => (useDefaults ? meta.legacyDefaultOn : aktivierteTabs.includes(meta.legacy.tabKey)))
    .map(meta => meta.legacy.navId);

  // Synchron ins DOM, wie das bisherige direkte `d-none`-Toggeln (Aufrufer lesen die Sichtbarkeit danach z. B. per `closest('li')`).
  flushExtern(() => setFeatureTabsVisible(navIds));
}

/** Versteckt alle Feature-Tabs (z. B. beim logoutUser). */
export function hideAllFeatureTabs(): void {
  flushExtern(() => setFeatureTabsVisible([]));
}
