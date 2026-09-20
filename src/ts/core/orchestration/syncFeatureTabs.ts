import { featureLifecycleRegistry, featureRegistry } from '@/core/hooks';
import type { FeatureContext, FeatureMeta } from '@/core/hooks';
import { getResourceStatus, hasPendingTableChanges } from '@/infrastructure/autoSave/autoSave';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';

/** Aktuell gemountete Feature-Namen — verhindert doppeltes register()/unregister() bei unverändertem Zustand. */
const mountedFeatures = new Set<string>();

/**
 * Prüft, ob Ressourcen des Features noch ungesyncte Änderungen haben oder im Fehlerstatus sind.
 *
 * @param meta - Metadaten des Features (`resources`).
 * @returns `true`, wenn mindestens eine Ressource Änderungen oder einen Fehler trägt.
 */
function hasUnsyncedChanges(meta: FeatureMeta): boolean {
  return meta.resources.some(
    ({ key }) => hasPendingTableChanges(key, true) || getResourceStatus(key).status === 'error',
  );
}

/**
 * Mountet/unmountet den Tab-Inhalt von Bereitschaft/EWT/Neben/EA passend zu aktivierteTabs.
 * Aufgerufen aus loadUserDaten.ts (Login + Jahr-/Monatswechsel) und aus saveDaten.ts (nach flushAll(),
 * damit ein live deaktiviertes Feature erst unmounted wird, wenn seine Daten sicher geflusht sind).
 *
 * Bleibt eine Ressource trotz Flush ungesynct (offline/Fehler), wird das Unmounten für dieses Feature in
 * diesem Durchlauf übersprungen (Set-Eintrag bleibt "gemountet") und eine Warn-Snackbar gezeigt — der
 * nächste erfolgreiche Aufruf (nächstes Speichern oder Login) holt das Unmounten automatisch nach.
 *
 * @param aktivierteTabs - Schlüssel der aktiven Tabs; leer/`undefined` steht für die Features mit `legacyDefaultOn`.
 */
export async function syncFeatureTabs(aktivierteTabs: string[] | undefined): Promise<void> {
  const metas = featureRegistry.metas();
  const enabledKeys =
    !aktivierteTabs || aktivierteTabs.length === 0
      ? metas.filter(meta => meta.legacyDefaultOn).map(meta => meta.legacy.tabKey)
      : aktivierteTabs;

  for (const meta of metas) {
    const name = meta.legacy.lifecycleName;
    const shouldBeMounted = enabledKeys.includes(meta.legacy.tabKey);
    const isMounted = mountedFeatures.has(name);
    if (shouldBeMounted === isMounted) continue;

    const feature = featureLifecycleRegistry.getFeature(name);
    if (!feature) continue;

    if (shouldBeMounted) {
      try {
        await feature.register({} as FeatureContext);
        mountedFeatures.add(name);
      } catch (error) {
        // Feature-Chunk nicht ladbar (offline, veraltete Version): nicht als gemountet merken, damit der
        // naechste Aufruf es erneut versucht; die uebrige App laeuft weiter.
        console.error(`Feature '${name}' konnte nicht geladen werden:`, error);
        createSnackBar({
          message: `${meta.longLabel ?? meta.label} konnte nicht geladen werden – bitte Seite neu laden`,
          status: 'error',
          timeout: 5000,
          fixed: true,
        });
      }
      continue;
    }

    if (hasUnsyncedChanges(meta)) {
      createSnackBar({
        message: `${meta.longLabel ?? meta.label} konnte nicht deaktiviert werden – ungespeicherte Änderungen`,
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
