import type { CustomTable, CustomTableTypes } from '@/shared/ui/custom-table/CustomTable';
import type { TResourceKey } from '@/types';
import { publishEvent } from '@/core';
import Storage from '@/shared/lib/storage/Storage';
import mergeVisibleResourceRows from './mergeVisibleResourceRows';
import { storageKeyOf } from './resourceConfig';

type PersistableResource = Exclude<TResourceKey, 'settings' | 'EWT'>;

/**
 * Schreibt die aktuell sichtbaren Zeilen der Tabelle (mit den übrigen Monaten zusammengeführt) in
 * den Storage und meldet die Änderung per `data:changed`-Event.
 *
 * @typeParam T - Zeilentyp der Ressource.
 * @param resource - Ressource; bestimmt den Storage-Key.
 * @param ft - Live-Tabelle mit den sichtbaren Zeilen.
 * @returns Die zusammengeführte Gesamtliste, wie im Storage abgelegt.
 */
export default function persistTableData<T extends CustomTableTypes>(
  resource: PersistableResource,
  ft: CustomTable<T>,
): T[] {
  const storageKey = storageKeyOf(resource);
  const mergedRows = mergeVisibleResourceRows(resource, ft);
  Storage.set(storageKey, mergedRows);
  publishEvent('data:changed', { resource: 'all', action: 'sync' });
  return mergedRows;
}
