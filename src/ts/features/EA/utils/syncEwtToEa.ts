import type { IDatenEA, IDatenEWT } from '@/types';
import { syncFieldsFromEwtRows } from '@/infrastructure/data/syncFieldsFromEwtRows';
import calculateEaDauerFromEwt from './calculateEaDauerFromEwt';

export default function syncEaDurationFromEwtRows(updatedEwtRows: IDatenEWT[]): void {
  syncFieldsFromEwtRows<IDatenEA>(updatedEwtRows, {
    storageKey: 'dataEA',
    tableId: 'tableEA',
    resource: 'EA',
    deriveFields: ewt => ({ Dauer: calculateEaDauerFromEwt(ewt) }),
  });
}
