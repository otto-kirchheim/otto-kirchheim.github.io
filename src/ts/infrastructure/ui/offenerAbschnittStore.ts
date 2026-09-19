import { useSyncExternalStore } from 'react';

/**
 * Welcher Abschnitt des Einstellungen-Akkordeons gerade offen ist (`collapseOne` ... `collapseSix`),
 * als `useSyncExternalStore`-kompatibler Modul-Store, analog `activeTabStore.ts`.
 *
 * Warum ein eigener Zustand statt `<DBAccordion behavior="single">`: die Einzel-Auswahl schliesst
 * die anderen Abschnitte nativ ueber das `name`-Attribut, `DBAccordionItem` behaelt aber seinen
 * internen "offen"-Zustand -- ein zuvor geoeffneter, dann nativ geschlossener Abschnitt braucht
 * dadurch beim naechsten Klick ZWEI Klicks (Live-Test 2026-09-19, DB UX 5.5.0). Mit einer einzigen
 * Wahrheit (`open` + `onToggle`) bleibt jeder Klick wirksam, und der Onboarding-Sprung
 * (`springeZu`) kann einen Abschnitt von aussen oeffnen, ohne den Zustand zu umgehen.
 */
type Listener = () => void;

let offenerAbschnitt: string | null = null;
const listeners = new Set<Listener>();

export function getOffenenAbschnitt(): string | null {
  return offenerAbschnitt;
}

export function subscribeOffenenAbschnitt(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** `null` klappt alle Abschnitte zu. */
export function setOffenenAbschnitt(id: string | null): void {
  if (id === offenerAbschnitt) return;
  offenerAbschnitt = id;
  for (const listener of listeners) listener();
}

export function useOffenenAbschnitt(): string | null {
  return useSyncExternalStore(subscribeOffenenAbschnitt, getOffenenAbschnitt, getOffenenAbschnitt);
}
