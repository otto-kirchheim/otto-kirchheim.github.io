/**
 * Monatsermittlung, die mehrere Features brauchen: EWT (auch fuer die Zuordnung in EZ/EA, siehe `getEwtDaten`), der
 * `Tag`-Parser von EZ/EA und `filterByMonat`. Die Monatsermittlung je Ressource liegt sonst im Feature (`model/monat.ts`).
 */

import type { IDatenEWT, TEwtFilter } from '@/types';
import dayjs from './configDayjs';
import Storage from '../storage/Storage';

/**
 * Monat des Starttags einer EWT (`Tag`).
 *
 * @param item - EWT-Zeile.
 * @returns Monat (1-12).
 */
export function getMonatFromEWT(item: IDatenEWT): number {
  return dayjs(item.Tag).month() + 1;
}

/**
 * Monat des Buchungstags einer EWT; ohne `Buchungstag` der des Starttags.
 *
 * @param item - EWT-Zeile.
 * @returns Monat (1-12).
 */
export function getMonatFromEWTBuchungstag(item: IDatenEWT): number {
  const basis = item.Buchungstag || item.Tag;
  return dayjs(basis).month() + 1;
}

/**
 * Prüft, ob eine EWT in den Monat fällt.
 *
 * @param item - EWT-Zeile.
 * @param monat - Monat (1-12).
 * @param mode - `'starttag'`, `'buchungstag'` oder `'beide'` (Standard: Start- oder Buchungstag passt).
 * @returns `true`, wenn die EWT nach `mode` im Monat liegt.
 */
export function isEwtInMonat(item: IDatenEWT, monat: number, mode: TEwtFilter = 'beide'): boolean {
  if (mode === 'starttag') return getMonatFromEWT(item) === monat;
  if (mode === 'buchungstag') return getMonatFromEWTBuchungstag(item) === monat;
  return getMonatFromEWT(item) === monat || getMonatFromEWTBuchungstag(item) === monat;
}

/**
 * Monat aus einem `Tag`-Wert von Nebengeld-/Entgeltausgleich-Zeilen: `DD.MM.YYYY`, eine reine
 * Tageszahl (dann gilt der gespeicherte Monat) oder ein ISO-Datum.
 *
 * @param tag - Wert des Feldes `Tag`.
 * @returns Monat (1-12).
 */
export function monatAusTag(tag: string): number {
  const parsedDate = dayjs(tag, 'DD.MM.YYYY', true);
  if (parsedDate.isValid()) return parsedDate.month() + 1;

  if (/^\d{1,2}$/.test(tag)) {
    return Storage.get<number>('Monat', { default: dayjs().month() + 1 });
  }

  return dayjs(tag).month() + 1;
}

/**
 * Filtert Zeilen auf einen Monat.
 *
 * @typeParam T - Zeilentyp.
 * @param items - Zeilen.
 * @param monat - Monat (1-12).
 * @param getMonat - Monatsermittlung je Zeile (z. B. `getMonatFromBZ`).
 * @returns Die Zeilen, deren Monat `monat` entspricht.
 */
export function filterByMonat<T>(items: T[], monat: number, getMonat: (item: T) => number): T[] {
  return items.filter(item => getMonat(item) === monat);
}
