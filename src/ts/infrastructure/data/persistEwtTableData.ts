import type { IDatenEWT } from '../../interfaces';
import type { CustomTable } from '../../class/CustomTable';
import { publishDataChanged, publishEvent } from '../../core';
import Storage from '../storage/Storage';
import normalizeResourceRows from './normalizeResourceRows';
import mergeVisibleResourceRows from './mergeVisibleResourceRows';
import { default as tableToArray } from './tableToArray';
import calculateBuchungstagEwt from '../date/calculateBuchungstagEwt';

export default function persistEwtTableData(ft: CustomTable<IDatenEWT>): IDatenEWT[] {
  const rawRows = typeof ft.getRows === 'function' ? ft.getRows() : [];
  const liveRows = Array.isArray(rawRows) ? rawRows.filter(row => row._state !== 'deleted') : [];
  let hasLiveSyncChanges = false;

  normalizeResourceRows<IDatenEWT>(tableToArray<IDatenEWT>(ft)).forEach((row, index) => {
    const normalizedRow = {
      ...row,
      buchungstagE: calculateBuchungstagEwt(row),
    };

    const liveRow = liveRows[index];
    if (liveRow && liveRow.cells.buchungstagE !== normalizedRow.buchungstagE) {
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
  publishDataChanged();
  return mergedRows;
}
