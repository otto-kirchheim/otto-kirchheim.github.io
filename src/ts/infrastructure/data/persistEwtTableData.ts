import type { IDatenEWT } from '@/types';
import type { CustomTable } from '../table/CustomTable';
import { publishEvent } from '@/core';
import Storage from '../storage/Storage';
import normalizeResourceRows from './normalizeResourceRows';
import mergeVisibleResourceRows from './mergeVisibleResourceRows';
import { default as tableToArray } from './tableToArray';
import calculateBuchungstagEwt from '../date/calculateBuchungstagEwt';

/**
 * Schreibt die sichtbaren EWT-Zeilen in den Storage. Vorher wird `Buchungstag` neu berechnet und bei Abweichung in die Live-Zeile übernommen (Tabelle wird neu gezeichnet). Danach gehen die Events `ewt:persisted` und `data:changed` raus.
 *
 * @param ft - EWT-Tabelle.
 * @returns Zeilen, wie sie im Storage stehen.
 */
export default function persistEwtTableData(ft: CustomTable<IDatenEWT>): IDatenEWT[] {
  const rawRows = typeof ft.getRows === 'function' ? ft.getRows() : [];
  const liveRows = Array.isArray(rawRows) ? rawRows.filter(row => row._state !== 'deleted') : [];
  let hasLiveSyncChanges = false;

  normalizeResourceRows<IDatenEWT>(tableToArray<IDatenEWT>(ft)).forEach((row, index) => {
    const normalizedRow = {
      ...row,
      Buchungstag: calculateBuchungstagEwt(row),
    };

    const liveRow = liveRows[index];
    if (liveRow && liveRow.cells.Buchungstag !== normalizedRow.Buchungstag) {
      liveRow.cells = normalizedRow;
      hasLiveSyncChanges = true;
    }
  });

  if (hasLiveSyncChanges && typeof ft.drawRows === 'function') {
    ft.drawRows();
  }

  const mergedRows = mergeVisibleResourceRows('EWT', ft);
  Storage.set('dataE', mergedRows);
  publishEvent('ewt:persisted', { rows: mergedRows });
  publishEvent('data:changed', { resource: 'all', action: 'sync' });
  return mergedRows;
}
