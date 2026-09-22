import { useSyncExternalStore } from 'react';

/**
 * Welcher Abschnitt des Einstellungen-Akkordeons gerade offen ist (`collapseOne` ... `collapseSix`),
 * als `useSyncExternalStore`-kompatibler Modul-Store, analog `activeTabStore.ts`.
 *
 * Warum ein eigener Zustand statt `<DBAccordion behavior="single">`: die Einzel-Auswahl schliesst
 * die anderen Abschnitte nativ ueber das `name`-Attribut, `DBAccordionItem` behaelt aber seinen
 * internen "offen"-Zustand -- ein zuvor geoeffneter, dann nativ geschlossener Abschnitt braucht
 * beim naechsten Klick zwei Klicks (DB UX 5.5.0). Mit einer einzigen Wahrheit (`open` + `onToggle`)
 * bleibt jeder Klick wirksam, und der Onboarding-Sprung (`springeZu`) kann einen Abschnitt von
 * aussen oeffnen.
 */
type Listener = () => void;

let offenerAbschnitt: string | null = null;
const listeners = new Set<Listener>();

/**
 * Liefert den offenen Abschnitt.
 *
 * @returns Id des offenen Abschnitts (`collapseOne` ...); `null`, wenn alle zu sind.
 */
export function getOffenenAbschnitt(): string | null {
  return offenerAbschnitt;
}

/**
 * Registriert einen Listener fuer Wechsel des offenen Abschnitts.
 *
 * @param listener - Callback ohne Argumente.
 * @returns Funktion, die den Listener wieder abmeldet.
 */
export function subscribeOffenenAbschnitt(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Setzt den offenen Abschnitt und benachrichtigt die Listener; bei unveraenderter Id passiert nichts.
 *
 * @param id - Id des zu oeffnenden Abschnitts; `null` klappt alle zu.
 */
export function setOffenenAbschnitt(id: string | null): void {
  if (id === offenerAbschnitt) return;
  offenerAbschnitt = id;
  for (const listener of listeners) listener();
}

/**
 * Hook: liest den offenen Abschnitt reaktiv aus dem Store.
 *
 * @returns Id des offenen Abschnitts oder `null`.
 */
export function useOffenenAbschnitt(): string | null {
  return useSyncExternalStore(subscribeOffenenAbschnitt, getOffenenAbschnitt, getOffenenAbschnitt);
}
