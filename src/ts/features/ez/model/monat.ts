import type { IDatenN } from '@/types';
import { monatAusTag } from '@/shared/lib/date/getMonatFromItem';

/**
 * Monat einer Nebengeld-Zeile (`Tag`, siehe `monatAusTag` in `shared/lib/date/getMonatFromItem`).
 *
 * @param item - Nebengeld-Zeile.
 * @returns Monat (1-12).
 */
export function getMonatFromN(item: IDatenN): number {
  return monatAusTag(item.Tag);
}
