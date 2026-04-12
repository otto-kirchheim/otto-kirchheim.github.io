import type { CustomTable, CustomTableTypes } from '../class/CustomTable';
import type { IDatenBE, IDatenBZ, IDatenEWT, IDatenN, TResourceKey } from '../interfaces';
import type { TStorageData } from './Storage';
import Storage from './Storage';
import dayjs from './configDayjs';
import { getMonatFromBE, getMonatFromBZ, getMonatFromN, isEwtInMonat } from './getMonatFromItem';
import normalizeResourceRows from './normalizeResourceRows';

type ResourceKind = Exclude<TResourceKey, 'settings'>;

const RESOURCE_STORAGE_MAP: Record<ResourceKind, TStorageData> = {
  BZ: 'dataBZ',
  BE: 'dataBE',
  EWT: 'dataE',
  N: 'dataN',
};

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
  const activeMonat = Storage.get<number>('Monat', { default: dayjs().month() + 1 });

  const rawRowsCandidate =
    typeof table.getRows === 'function' ? table.getRows() : Array.isArray(table.rows?.array) ? table.rows.array : [];
  const rawRows = Array.isArray(rawRowsCandidate) ? rawRowsCandidate : [];

  const filteredRowsCandidate =
    typeof table.rows?.getFilteredRows === 'function' ? table.rows.getFilteredRows() : rawRows;
  const filteredRows = Array.isArray(filteredRowsCandidate) ? filteredRowsCandidate : rawRows;

  const allActiveRows = rawRows.filter(row => row._state !== 'deleted').map(row => row.cells as T);
  const visibleRows = filteredRows.filter(row => row._state !== 'deleted').map(row => row.cells as T);

  const shouldMergeWithStoredYear =
    filteredRows.length < rawRows.length ||
    allActiveRows.length === 0 ||
    allActiveRows.every(row => isRowInActiveMonat(resource, row as CustomTableTypes, activeMonat));

  if (!shouldMergeWithStoredYear) {
    return allActiveRows;
  }

  const existingRows = normalizeResourceRows<T>(Storage.get<unknown>(storageKey, { default: [] }));
  const preservedRows = existingRows.filter(row => !isRowInActiveMonat(resource, row as CustomTableTypes, activeMonat));

  return [...preservedRows, ...visibleRows];
}
