import { featureLifecycleRegistry } from '@/core/hooks';
import type { FeatureContext } from '@/core/hooks';
import { getResourceStatus, hasPendingTableChanges } from '@/infrastructure/autoSave/autoSave';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import type { TResourceKey } from '@/types';

type TabResourceKey = Exclude<TResourceKey, 'settings'>;

/** Mapping: aktivierteTabs-Wert → featureLifecycleRegistry-Name (siehe updateTabVisibility.ts) */
const FEATURE_TAB_MAP: Record<string, string> = {
  bereitschaft: 'Bereitschaft',
  ewt: 'EWT',
  neben: 'Neben',
  ea: 'EA',
};

/**
 * Tabs, die bei leerem aktivierteTabs (Alt-User ohne explizite Einstellung) weiterhin automatisch
 * an sind. 'ea' ist bewusst NICHT enthalten — der Tab mountet nur, wenn aktivierteTabs 'ea' explizit
 * enthält, damit er für Bestands- und Neu-User nicht ungewollt standardmäßig sichtbar wird.
 */
const LEGACY_DEFAULT_ON_KEYS = ['bereitschaft', 'ewt', 'neben'];

/** Ressourcen je Feature — vor dem Unmount geprüft, ob dort noch ungesynchte Änderungen liegen. */
const FEATURE_RESOURCES: Record<string, TabResourceKey[]> = {
  Bereitschaft: ['BZ', 'BE'],
  EWT: ['EWT'],
  Neben: ['N'],
  EA: ['EA'],
};

/** Anzeigename je Feature für die Warn-Snackbar. */
const FEATURE_LABELS: Record<string, string> = {
  Bereitschaft: 'Bereitschaft',
  EWT: 'EWT',
  Neben: 'Nebenbezüge',
  EA: 'Entgeltausgleich',
};

/** Aktuell gemountete Feature-Namen — verhindert doppeltes register()/unregister() bei unverändertem Zustand. */
const mountedFeatures = new Set<string>();

function hasUnsyncedChanges(name: string): boolean {
  const resources = FEATURE_RESOURCES[name] ?? [];
  return resources.some(
    resource => hasPendingTableChanges(resource, true) || getResourceStatus(resource).status === 'error',
  );
}

/**
 * Mountet/unmountet den Tab-Inhalt von Bereitschaft/EWT/Neben passend zu aktivierteTabs.
 * Aufgerufen aus loadUserDaten.ts (Login + Jahr-/Monatswechsel) und aus saveDaten.ts (nach flushAll(),
 * damit ein live deaktiviertes Feature erst unmounted wird, wenn seine Daten sicher geflusht sind).
 *
 * Bleibt eine Ressource trotz Flush ungesynct (offline/Fehler), wird das Unmounten für dieses Feature in
 * diesem Durchlauf übersprungen (Set-Eintrag bleibt "gemountet") und eine Warn-Snackbar gezeigt — der
 * nächste erfolgreiche Aufruf (nächstes Speichern oder Login) holt das Unmounten automatisch nach.
 */
export async function syncFeatureTabs(aktivierteTabs: string[] | undefined): Promise<void> {
  const enabledKeys = !aktivierteTabs || aktivierteTabs.length === 0 ? LEGACY_DEFAULT_ON_KEYS : aktivierteTabs;

  for (const [key, name] of Object.entries(FEATURE_TAB_MAP)) {
    const shouldBeMounted = enabledKeys.includes(key);
    const isMounted = mountedFeatures.has(name);
    if (shouldBeMounted === isMounted) continue;

    const feature = featureLifecycleRegistry.getFeature(name);
    if (!feature) continue;

    if (shouldBeMounted) {
      await feature.register({} as FeatureContext);
      mountedFeatures.add(name);
      continue;
    }

    if (hasUnsyncedChanges(name)) {
      createSnackBar({
        message: `${FEATURE_LABELS[name]} konnte nicht deaktiviert werden – ungespeicherte Änderungen`,
        status: 'warning',
        timeout: 5000,
        fixed: true,
      });
      continue;
    }

    await feature.unregister?.();
    mountedFeatures.delete(name);
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
