import { featureRegistry } from '@/shared/lib/feature';
import type { IFeatureBerechnung } from '@/types';
import { createSnackBar } from '@/shared/ui/snackbar/CustomSnackbar';

/** Berechnungs-Slot eines Features samt Kennung; `tabKey` ist der `aktivierteTabs`-Wert des Features. */
export interface IBerechnungTeil {
  id: string;
  tabKey: string;
  part: IFeatureBerechnung;
}

/** Berechnungs-Teil mit den Hilfsdaten der aktuellen Darstellung (`vorbereite()` des Features). */
export interface IBerechnungGruppe extends IBerechnungTeil {
  extra: unknown;
}

/**
 * Laedt den Berechnungs-Slot aller Features (nach `meta.order`). Ein fehlgeschlagener Teil blockiert die anderen nicht;
 * dann fehlt seine Gruppe, und eine Snackbar bittet um Neuladen.
 *
 * @returns Die geladenen Teile; Features ohne Slot oder mit Ladefehler fehlen.
 */
export async function ladeBerechnungsTeile(): Promise<IBerechnungTeil[]> {
  const ergebnisse = await featureRegistry.loadAll('berechnung');
  const teile: IBerechnungTeil[] = [];

  for (const ergebnis of ergebnisse) {
    const meta = featureRegistry.meta(ergebnis.id);
    if (!meta) continue;

    if (ergebnis.ok) {
      teile.push({ id: ergebnis.id, tabKey: meta.legacy.tabKey, part: ergebnis.part });
    } else {
      console.error(`Berechnung von '${ergebnis.id}' konnte nicht geladen werden:`, ergebnis.error);
      createSnackBar({
        message: `Berechnung unvollständig: ${meta.longLabel ?? meta.label} konnte nicht geladen werden – bitte Seite neu laden.`,
        status: 'error',
        timeout: 5000,
        fixed: true,
      });
    }
  }

  return teile;
}
