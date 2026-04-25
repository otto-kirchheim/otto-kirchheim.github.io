import type { CustomTable, CustomTableTypes, Row } from '../table/CustomTable';
import type { IDatenBE, IDatenBZ, IDatenEWT, IDatenN } from '../../interfaces';
import Storage from '../storage/Storage';
import { getStoredMonatJahr } from '../date/dateStorage';
import { getMonatFromBE, getMonatFromBZ, getMonatFromN, isEwtInMonat } from '../date/getMonatFromItem';
import normalizeResourceRows from './normalizeResourceRows';
import { type ResourceKind, RESOURCE_STORAGE_MAP } from './resourceConfig';

function isRowInActiveMonat(resource: ResourceKind, row: CustomTableTypes, monat: number): boolean {
  switch (resource) {
    case 'BZ':
      return getMonatFromBZ(row as IDatenBZ) === monat;
    case 'BE':
      return getMonatFromBE(row as IDatenBE) === monat;
    case 'EWT':
      return isEwtInMonat(row as IDatenEWT, monat);
    case 'N':
      return getMonatFromN(row as IDatenN) === monat;
  }
}

/**
 * Schreibt nur die aktuell sichtbaren Monatszeilen zurück in den Storage und behält
 * alle übrigen Monate des bereits geladenen Jahres unverändert bei.
 */
export default function mergeVisibleResourceRows<T extends CustomTableTypes>(
  resource: ResourceKind,
  table: CustomTable<T>,
): T[] {
  const storageKey = RESOURCE_STORAGE_MAP[resource];
  const activeMonat = getStoredMonatJahr().monat;

  const rawRowsCandidate =
    typeof table.getRows === 'function' ? table.getRows() : Array.isArray(table.rows?.array) ? table.rows.array : [];
  const rawRows = Array.isArray(rawRowsCandidate) ? rawRowsCandidate : [];

  const filteredRowsCandidate =
    typeof table.rows?.getFilteredRows === 'function' ? table.rows.getFilteredRows() : rawRows;
  const filteredRows = Array.isArray(filteredRowsCandidate) ? filteredRowsCandidate : rawRows;

  const toStorage = (row: Row<T>): T =>
    row._state === 'deleted' ? { ...(row.cells as T), __localState: 'deleted' } : (row.cells as T);

  const allRows = rawRows.map(toStorage);
  const visibleRows = filteredRows.map(toStorage);

  const shouldMergeWithStoredYear =
    filteredRows.length < rawRows.length ||
    allRows.length === 0 ||
    allRows.every(row => isRowInActiveMonat(resource, row as CustomTableTypes, activeMonat));

  if (!shouldMergeWithStoredYear) {
    return allRows;
  }

  const existingRows = normalizeResourceRows<T>(Storage.get<unknown>(storageKey, { default: [] }));
  const preservedRows = existingRows.filter(row => !isRowInActiveMonat(resource, row as CustomTableTypes, activeMonat));

  return [...preservedRows, ...visibleRows];
}
