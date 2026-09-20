import type { Dayjs } from 'dayjs';
import type { IDatenBE, IDatenBZ, IDatenEA, IDatenEWT, IDatenN, TEwtFilter } from '@/types';
import dayjs from './configDayjs';
import Storage from '../storage/Storage';

/**
 * Monat (1-12) eines Datums.
 *
 * @param value - Datum als String oder Dayjs.
 * @returns Monat, 1 = Januar.
 */
function toMonat(value: string | Dayjs): number {
  return dayjs(value).month() + 1;
}

/**
 * Monat eines Bereitschaftszeitraums (`Beginn`).
 *
 * @param item - Bereitschaftszeitraum.
 * @returns Monat (1-12).
 */
export function getMonatFromBZ(item: IDatenBZ): number {
  return toMonat(item.Beginn as string | Dayjs);
}

/**
 * Monat eines Bereitschaftseinsatzes (`Tag` im Format `DD.MM.YYYY`).
 *
 * @param item - Bereitschaftseinsatz.
 * @returns Monat (1-12).
 */
export function getMonatFromBE(item: IDatenBE): number {
  return dayjs(item.Tag, 'DD.MM.YYYY').month() + 1;
}

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
function monatAusTag(tag: string): number {
  const parsedDate = dayjs(tag, 'DD.MM.YYYY', true);
  if (parsedDate.isValid()) return parsedDate.month() + 1;

  if (/^\d{1,2}$/.test(tag)) {
    return Storage.get<number>('Monat', { default: dayjs().month() + 1 });
  }

  return dayjs(tag).month() + 1;
}

/**
 * Monat einer Nebengeld-Zeile (`Tag`, siehe `monatAusTag`).
 *
 * @param item - Nebengeld-Zeile.
 * @returns Monat (1-12).
 */
export function getMonatFromN(item: IDatenN): number {
  return monatAusTag(item.Tag);
}

/**
 * Monat einer Entgeltausgleich-Zeile (`Tag`, siehe `monatAusTag`).
 *
 * @param item - Entgeltausgleich-Zeile.
 * @returns Monat (1-12).
 */
export function getMonatFromEA(item: IDatenEA): number {
  return monatAusTag(item.Tag);
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
