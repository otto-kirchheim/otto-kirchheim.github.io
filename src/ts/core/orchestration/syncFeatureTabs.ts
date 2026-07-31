import { featureLifecycleRegistry } from '@/core/hooks';
import type { FeatureContext } from '@/core/hooks';

/** Mapping: aktivierteTabs-Wert → featureLifecycleRegistry-Name (siehe updateTabVisibility.ts) */
const FEATURE_TAB_MAP: Record<string, string> = {
  bereitschaft: 'Bereitschaft',
  ewt: 'EWT',
  neben: 'Neben',
};

/** Aktuell gemountete Feature-Namen — verhindert doppeltes register()/unregister() bei unverändertem Zustand. */
const mountedFeatures = new Set<string>();

/**
 * Mountet/unmountet den Tab-Inhalt von Bereitschaft/EWT/Neben passend zu aktivierteTabs.
 * Aufgerufen aus loadUserDaten.ts (Login + Jahr-/Monatswechsel) — bewusst nicht aus saveEinstellungen.ts,
 * damit eine Einstellungsänderung erst beim nächsten Reload/Login den Tab-Inhalt an-/abbaut (Nav-Sichtbarkeit
 * über updateTabVisibility.ts bleibt weiterhin sofort wirksam).
 */
export async function syncFeatureTabs(aktivierteTabs: string[] | undefined): Promise<void> {
  const enabledKeys = !aktivierteTabs || aktivierteTabs.length === 0 ? Object.keys(FEATURE_TAB_MAP) : aktivierteTabs;

  for (const [key, name] of Object.entries(FEATURE_TAB_MAP)) {
    const shouldBeMounted = enabledKeys.includes(key);
    const isMounted = mountedFeatures.has(name);
    if (shouldBeMounted === isMounted) continue;

    const feature = featureLifecycleRegistry.getFeature(name);
    if (!feature) continue;

    if (shouldBeMounted) {
      await feature.register({} as FeatureContext);
      mountedFeatures.add(name);
    } else {
      await feature.unregister?.();
      mountedFeatures.delete(name);
    }
  }
}

/**
 * Setzt den gemerkten Mount-Zustand zurück, ohne die Features erneut zu unregistrieren — das übernimmt
 * bereits featureLifecycleRegistry.teardownAll() beim Logout. Ohne diesen Reset würde syncFeatureTabs beim
 * nächsten Login fälschlich annehmen, ein Feature sei noch gemountet (obwohl teardownAll() es gerade
 * unabhängig von diesem Modul unmounted hat) und den Tab-Inhalt dann leer lassen.
 */
export function resetFeatureTabSync(): void {
  mountedFeatures.clear();
}
