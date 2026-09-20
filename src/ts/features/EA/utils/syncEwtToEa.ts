import type { IDatenEA, IDatenEWT } from '@/types';
import { syncFieldsFromEwtRows } from '@/infrastructure/data/syncFieldsFromEwtRows';
import calculateEaDauerFromEwt from './calculateEaDauerFromEwt';

/**
 * Überträgt die aus EWT abgeleitete Dauer (`calculateEaDauerFromEwt`) auf die passenden EA-Zeilen in Storage und Tabelle.
 *
 * @param updatedEwtRows - Geänderte EWT-Zeilen, deren Tage die EA-Dauer neu bestimmen.
 */
export default function syncEaDurationFromEwtRows(updatedEwtRows: IDatenEWT[]): void {
  syncFieldsFromEwtRows<IDatenEA>(updatedEwtRows, {
    storageKey: 'dataEA',
    tableId: 'tableEA',
    resource: 'EA',
    deriveFields: ewt => ({ Dauer: calculateEaDauerFromEwt(ewt) }),
  });
}
