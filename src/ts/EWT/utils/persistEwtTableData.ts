import type { CustomHTMLTableElement, IDatenEWT, IDatenN } from '../../interfaces';
import type { CustomTable } from '../../class/CustomTable';
import { Storage, tableToArray } from '../../utilities';
import { scheduleAutoSave } from '../../utilities/autoSave';
import aktualisiereBerechnung from '../../Berechnung/aktualisiereBerechnung';
import normalizeResourceRows from '../../utilities/normalizeResourceRows';
import mergeVisibleResourceRows from '../../utilities/mergeVisibleResourceRows';
import calculateBuchungstagEwt from './calculateBuchungstagEwt';

function syncNebengeldTimesFromEwtRows(updatedEwtRows: IDatenEWT[]): void {
  if (updatedEwtRows.length === 0) return;

  const ewtById = new Map<string, IDatenEWT>(updatedEwtRows.filter(e => e._id).map(e => [e._id as string, e]));

  const currentDataN = Storage.get<IDatenN[]>('dataN', { default: [] });
  let storageChanged = false;
  const nextDataN = currentDataN.map(item => {
    if (!item.ewtRef) return item;
    const ewt = ewtById.get(item.ewtRef);
    if (!ewt) return item;
    const newBegin = ewt.beginE as string;
    const newEnde = ewt.endeE as string;
    if (item.beginN === newBegin && item.endeN === newEnde) return item;
    storageChanged = true;
    return { ...item, beginN: newBegin, endeN: newEnde };
  });

  if (storageChanged) {
    Storage.set('dataN', nextDataN);

    const el = document.querySelector<CustomHTMLTableElement<IDatenN>>('#tableN');
    const nebenTable = el?.instance ?? null;
    if (!nebenTable) return;
    let tableChanged = false;
    for (const row of nebenTable.rows.array) {
      if (row._state === 'deleted') continue;
      const ref = (row.cells as IDatenN).ewtRef;
      if (!ref) continue;
      const ewt = ewtById.get(ref);
      if (!ewt) continue;
      const newBegin = ewt.beginE as string;
      const newEnde = ewt.endeE as string;
      if (row.cells.beginN === newBegin && row.cells.endeN === newEnde) continue;
      row.cells = { ...row.cells, beginN: newBegin, endeN: newEnde };
      if (row._state === 'unchanged') row._state = 'modified';
      tableChanged = true;
    }
    if (tableChanged && typeof nebenTable.drawRows === 'function') nebenTable.drawRows();
    if (tableChanged) scheduleAutoSave('N');
  }
}

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
  aktualisiereBerechnung();
  return mergedRows;
}
