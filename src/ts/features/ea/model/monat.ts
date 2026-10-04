import type { IDatenEA } from '@/types';
import { monatAusTag } from '@/shared/lib/date/getMonatFromItem';

/**
 * Monat einer Entgeltausgleich-Zeile (`Tag`, siehe `monatAusTag` in `shared/lib/date/getMonatFromItem`).
 *
 * @param item - Entgeltausgleich-Zeile.
 * @returns Monat (1-12).
 */
export function getMonatFromEA(item: IDatenEA): number {
  return monatAusTag(item.Tag);
}
