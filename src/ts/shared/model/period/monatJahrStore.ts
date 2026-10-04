/**
 * Gewaehlter Monat und Jahr fuer die Ueberschriften der Tabs, geschrieben von `setMonatJahr.ts`. Die Tabs
 * lesen reaktiv (`MonatUeberschrift.tsx`); vorher schrieb `setMonatJahr` den Text per `querySelector` in jede
 * gemountete Ueberschrift und `syncFeatureTabs` musste ihn nach jedem Mounten erneut schreiben.
 *
 * Zustand `null` = noch nicht gesetzt (vor dem ersten `setMonatJahr`): die Ueberschriften bleiben leer.
 */

type Listener = () => void;
export interface MonatJahr {
  monat: number;
  jahr: number;
}

let stand: MonatJahr | null = null;
const listeners = new Set<Listener>();

/**
 * Liefert den gesetzten Monat/Jahr.
 *
 * @returns Monat (1-12) und Jahr oder `null`, solange nichts gesetzt wurde. Die Referenz aendert sich nur bei Aenderung.
 */
export function getMonatJahr(): MonatJahr | null {
  return stand;
}

/**
 * Registriert einen Listener fuer Aenderungen von Monat/Jahr.
 *
 * @param listener - Callback ohne Argumente.
 * @returns Funktion, die den Listener wieder abmeldet.
 */
export function subscribeMonatJahr(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Setzt Monat und Jahr und benachrichtigt die Listener; bei gleichem Inhalt passiert nichts.
 *
 * @param jahr - Jahr.
 * @param monat - Monat 1-12.
 */
export function setMonatJahrStore(jahr: number, monat: number): void {
  if (stand && stand.jahr === jahr && stand.monat === monat) return;
  stand = { monat, jahr };
  for (const listener of listeners) listener();
}

/** Setzt den Zustand auf "nicht gesetzt" zurueck (nur fuer Tests). */
export function resetMonatJahr(): void {
  stand = null;
  for (const listener of listeners) listener();
}
