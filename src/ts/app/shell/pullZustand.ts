import { flushExtern } from '@/shared/lib/react-root/reactRoot';

/** Zustand des Zieh-Indikators: Anteil der Ausloese-Distanz (0..1), Schwelle erreicht, Neuladen laeuft. */
export type PullZustand = { fortschritt: number; bereit: boolean; laedt: boolean };

let zustand: PullZustand = { fortschritt: 0, bereit: false, laedt: false };
const abonnenten = new Set<() => void>();

/**
 * Setzt den Zustand des Indikators und benachrichtigt die gemountete Komponente (`pullToRefresh.ts` laeuft ausserhalb von React).
 *
 * @param neu - Neuer Zustand.
 */
export function setzePullZustand(neu: PullZustand): void {
  if (neu.fortschritt === zustand.fortschritt && neu.bereit === zustand.bereit && neu.laedt === zustand.laedt) return;
  zustand = neu;
  // Synchron rendern: der Indikator folgt dem Finger, ein verzoegertes Update ruckelt (und Tests lesen direkt danach).
  flushExtern(() => {
    for (const abonnent of abonnenten) abonnent();
  });
}

/**
 * Meldet einen Abonnenten an (`useSyncExternalStore`).
 *
 * @param abonnent - Wird bei jeder Aenderung aufgerufen.
 * @returns Funktion zum Abmelden.
 */
export function abonniereZustand(abonnent: () => void): () => void {
  abonnenten.add(abonnent);
  return () => abonnenten.delete(abonnent);
}

/**
 * Aktueller Zustand (Snapshot fuer `useSyncExternalStore`).
 *
 * @returns Der gespeicherte Zustand.
 */
export function leseZustand(): PullZustand {
  return zustand;
}
