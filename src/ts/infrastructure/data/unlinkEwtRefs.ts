import type { IDatenEA, IDatenN } from '@/types';
import { findTable } from '../autoSave/savePipeline';
import Storage from '../../shared/lib/storage/Storage';
import { storageKeyOf, tableIdOf } from './resourceConfig';

/**
 * Entfernt in Storage und offener Tabelle einer Ressource (`N`, `EA`) die `EWT`-Verknuepfung auf geloeschte
 * EWT-Zeilen. Die Tabellenzeilen behalten ihren Zustand (kein `modified`).
 *
 * @param resource - Ressource mit `EWT`-Verweis (`N` oder `EA`).
 * @param deletedIds - Ids der auf dem Server geloeschten EWT-Datensaetze.
 */
export function unlinkEwtRefsForDeletedIds(resource: 'N' | 'EA', deletedIds: string[]): void {
  if (deletedIds.length === 0) return;

  type Row = IDatenN | IDatenEA;
  const deletedIdSet = new Set(deletedIds);
  const storageKey = storageKeyOf(resource);

  /**
   * Entfernt den `EWT`-Verweis, wenn er auf eine geloeschte Id zeigt.
   *
   * @param item - Zeile.
   * @returns Zeile ohne Verweis; `null`, wenn nichts zu entfernen war.
   */
  const withoutDeletedRef = (item: Row): Row | null => {
    if (!item.EWT || !deletedIdSet.has(item.EWT)) return null;
    const { EWT: _removed, ...rest } = item;
    return rest as Row;
  };

  const currentData = Storage.get<Row[]>(storageKey, { default: [] });
  let storageChanged = false;
  const nextData = currentData.map(item => {
    const next = withoutDeletedRef(item);
    if (!next) return item;
    storageChanged = true;
    return next;
  });
  if (storageChanged) Storage.set(storageKey, nextData);

  const table = findTable<Row>(tableIdOf(resource));
  if (!table) return;

  const tableChanged = table.rows.syncCellsSilently(row => withoutDeletedRef(row.cells as Row));
  if (tableChanged && typeof table.drawRows === 'function') table.drawRows();
}
