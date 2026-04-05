import type { IDatenEWT } from '../../interfaces';
import type { CustomTable } from '../../class/CustomTable';
import { Storage, tableToArray } from '../../utilities';
import aktualisiereBerechnung from '../../Berechnung/aktualisiereBerechnung';
import normalizeResourceRows from '../../utilities/normalizeResourceRows';
import calculateBuchungstagEwt from './calculateBuchungstagEwt';

export default function persistEwtTableData(ft: CustomTable<IDatenEWT>): IDatenEWT[] {
  const rawRows = typeof ft.getRows === 'function' ? ft.getRows() : [];
  const liveRows = Array.isArray(rawRows) ? rawRows.filter(row => row._state !== 'deleted') : [];
  let hasLiveSyncChanges = false;

  const allRows = normalizeResourceRows<IDatenEWT>(tableToArray<IDatenEWT>(ft)).map((row, index) => {
    const normalizedRow = {
      ...row,
      buchungstagE: calculateBuchungstagEwt(row),
    };

    const liveRow = liveRows[index];
    if (liveRow && liveRow.cells.buchungstagE !== normalizedRow.buchungstagE) {
      liveRow.cells = normalizedRow;
      hasLiveSyncChanges = true;
    }

    return normalizedRow;
  });

  if (hasLiveSyncChanges && typeof ft.drawRows === 'function') {
    ft.drawRows();
  }

  Storage.set('dataE', allRows);
  aktualisiereBerechnung();
  return allRows;
}
