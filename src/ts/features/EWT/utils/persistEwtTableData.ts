import type { IDatenEWT } from '../../../interfaces';
import type { CustomTable } from '../../../class/CustomTable';
import { Storage, tableToArray } from '../../../utilities';
import { publishDataChanged } from '../../../core';
import normalizeResourceRows from '../../../infrastructure/data/normalizeResourceRows';
import mergeVisibleResourceRows from '../../../infrastructure/data/mergeVisibleResourceRows';
import calculateBuchungstagEwt from '../../../infrastructure/date/calculateBuchungstagEwt';
import syncNebengeldTimesFromEwtRows from '../../../orchestration/syncEwtToNeben';

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
  syncNebengeldTimesFromEwtRows(mergedRows);
  publishDataChanged();
  return mergedRows;
}
