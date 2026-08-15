import type { CustomHTMLTableElement, IDatenEA, IDatenEWT } from '@/types';
import { default as Storage } from '@/infrastructure/storage/Storage';
import { publishEvent } from '@/core';
import calculateEaDauerFromEwt from './calculateEaDauerFromEwt';

export default function syncEaDurationFromEwtRows(updatedEwtRows: IDatenEWT[]): void {
  if (updatedEwtRows.length === 0) return;

  const ewtById = new Map<string, IDatenEWT>(updatedEwtRows.filter(e => e._id).map(e => [e._id as string, e]));

  const currentDataEA = Storage.get<IDatenEA[]>('dataEA', { default: [] });
  let storageChanged = false;
  const nextDataEA = currentDataEA.map(item => {
    if (!item.EWT) return item;
    const ewt = ewtById.get(item.EWT);
    if (!ewt) return item;
    const newDauer = calculateEaDauerFromEwt(ewt);
    if (item.Dauer === newDauer) return item;
    storageChanged = true;
    return { ...item, Dauer: newDauer };
  });

  if (storageChanged) {
    Storage.set('dataEA', nextDataEA);

    const el = document.querySelector<CustomHTMLTableElement<IDatenEA>>('#tableEA');
    const eaTable = el?.instance ?? null;
    if (!eaTable) return;
    let tableChanged = false;
    for (const row of eaTable.rows.array) {
      if (row._state === 'deleted') continue;
      const ref = (row.cells as IDatenEA).EWT;
      if (!ref) continue;
      const ewt = ewtById.get(ref);
      if (!ewt) continue;
      const newDauer = calculateEaDauerFromEwt(ewt);
      if (row.cells.Dauer === newDauer) continue;
      row.cells = { ...row.cells, Dauer: newDauer };
      if (row._state === 'unchanged') row._state = 'modified';
      tableChanged = true;
    }
    if (tableChanged && typeof eaTable.drawRows === 'function') eaTable.drawRows();
    if (tableChanged) publishEvent('data:changed', { resource: 'EA', action: 'update' });
  }
}
