import { useSyncExternalStore } from 'react';
import { featureRegistry } from '@/shared/lib/feature';
import type { IFeatureEinstellungen } from '@/types';
import { createSnackBar } from '../../ui/snackbar/CustomSnackbar';
import { flushExtern } from '../../lib/react-root/reactRoot';

/**
 * Geladene Einstellungen-Slots der Features (Teil `einstellungen`), nach `meta.order`. `EinstellungenTab` rendert daraus die
 * Abschnitte der Features; `generateEingabeMaskeEinstellungen` und `saveEinstellungen` lesen und sammeln ueber dieselben Slots.
 * Ein Feature ohne Slot oder mit Ladefehler fehlt (dann auch sein Abschnitt und seine Felder).
 */
export interface IEinstellungenTeil {
  id: string;
  part: IFeatureEinstellungen;
}

type Listener = () => void;

let teile: readonly IEinstellungenTeil[] = [];
const listeners = new Set<Listener>();

/**
 * Liefert die bisher geladenen Einstellungen-Slots.
 *
 * @returns Slots nach `meta.order`; leer, solange nichts geladen wurde. Die Referenz aendert sich nur bei Aenderung.
 */
export function getEinstellungenTeile(): readonly IEinstellungenTeil[] {
  return teile;
}

/**
 * Registriert einen Listener fuer Aenderungen der geladenen Slots.
 *
 * @param listener - Callback ohne Argumente.
 * @returns Funktion, die den Listener wieder abmeldet.
 */
export function subscribeEinstellungenTeile(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Laedt die Einstellungen-Slots aller Features (einmal, danach aus dem Cache) und meldet sie den Abschnitten. Ein
 * fehlgeschlagener Slot blockiert die anderen nicht; dann fehlt sein Abschnitt, und eine Snackbar bittet um Neuladen.
 * Der Store wird synchron ins DOM geschrieben (`flushExtern`), die Abschnitte stehen also direkt nach dem Aufruf.
 *
 * @returns Die geladenen Slots.
 */
export async function ladeEinstellungenTeile(): Promise<readonly IEinstellungenTeil[]> {
  const ergebnisse = await featureRegistry.loadAll('einstellungen');
  const geladen: IEinstellungenTeil[] = [];

  for (const ergebnis of ergebnisse) {
    if (ergebnis.ok) {
      geladen.push({ id: ergebnis.id, part: ergebnis.part });
    } else {
      const meta = featureRegistry.meta(ergebnis.id);
      console.error(`Einstellungen von '${ergebnis.id}' konnten nicht geladen werden:`, ergebnis.error);
      createSnackBar({
        message: `Einstellungen unvollständig: ${meta?.longLabel ?? meta?.label ?? ergebnis.id} konnte nicht geladen werden – bitte Seite neu laden.`,
        status: 'error',
        timeout: 5000,
        fixed: true,
      });
    }
  }

  const unveraendert = geladen.length === teile.length && geladen.every((teil, i) => teil.part === teile[i].part);
  if (!unveraendert) {
    flushExtern(() => {
      teile = geladen;
      for (const listener of listeners) listener();
    });
  }
  return teile;
}

/** Setzt den Store zurueck (nur fuer Tests). */
export function resetEinstellungenTeile(): void {
  teile = [];
  for (const listener of listeners) listener();
}

/**
 * Reaktiver Zugriff auf die geladenen Einstellungen-Slots.
 *
 * @returns Die geladenen Slots nach `meta.order`.
 */
export function useEinstellungenTeile(): readonly IEinstellungenTeil[] {
  return useSyncExternalStore(subscribeEinstellungenTeile, getEinstellungenTeile);
}
