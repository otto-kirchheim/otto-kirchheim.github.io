import type { CustomTable, CustomTableTypes, Row, RowState } from '../table/CustomTable';
import type { IDatenBE, IDatenBZ, IDatenEA, IDatenEWT, IDatenN } from '@/types';
import Storage from '../storage/Storage';
import { getStoredMonatJahr } from '../date/dateStorage';
import { getMonatFromBE, getMonatFromBZ, getMonatFromEA, getMonatFromN, isEwtInMonat } from '../date/getMonatFromItem';
import normalizeResourceRows from './normalizeResourceRows';
import { type ResourceKind, RESOURCE_STORAGE_MAP } from './resourceConfig';

/**
 * Prueft, ob ein Datensatz zum angegebenen Monat gehoert (Monatsermittlung je Ressource).
 *
 * @param resource - Ressourcenart.
 * @param row - Zellen des Datensatzes.
 * @param monat - Monat (1-12).
 * @returns `true`, wenn der Datensatz im Monat liegt.
 */
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
    case 'EA':
      return getMonatFromEA(row as IDatenEA) === monat;
  }
}

/**
 * Schreibt nur die aktuell sichtbaren Monatszeilen zurück in den Storage und behält
 * alle übrigen Monate des bereits geladenen Jahres unverändert bei. Der Zeilenzustand wird als
 * `__localState` bzw. bei Fehlern als `__errorMessage`/`__errorState` mitgespeichert.
 *
 * @typeParam T - Zeilentyp der Ressource.
 * @param resource - Ressourcenart (bestimmt Storage-Key und Monatsermittlung).
 * @param table - Tabelle mit den aktuellen Zeilen.
 * @returns Neue Gesamtliste fuer den Storage; nur die Tabellenzeilen, wenn diese Monate
 *   ausserhalb des aktiven enthalten und ungefiltert sind (dann ersetzen sie den Storage komplett).
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

  /**
   * Wandelt eine Zeile in den Storage-Datensatz um (Zellen plus Zustand bzw. Fehlerinfo).
   *
   * @param row - Tabellenzeile.
   * @returns Zellen mit `__localState` oder `__errorMessage`/`__errorState`.
   */
  const toStorage = (row: Row<T>): T => {
    if (row._state === 'error' && row._errorMessage)
      return { ...(row.cells as T), __errorMessage: row._errorMessage, __errorState: row._errorState ?? 'new' };
    return { ...(row.cells as T), __localState: row._state as Exclude<RowState, 'error'> };
  };

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
