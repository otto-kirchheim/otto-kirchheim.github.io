import type { IDatenEWT, IDatenN } from '@/types';
import { syncFieldsFromEwtRows } from '@/infrastructure/data/syncFieldsFromEwtRows';

/**
 * Überträgt geänderte EWT-Zeiten (`beginE`/`endeE`) als `Beginn`/`Ende` in die per `EWT`-Referenz verknüpften Neben-Zeilen (Storage und offene Tabelle).
 *
 * @param updatedEwtRows - Geänderte EWT-Zeilen; ohne `_id` werden sie ignoriert.
 */
export default function syncNebengeldTimesFromEwtRows(updatedEwtRows: IDatenEWT[]): void {
  syncFieldsFromEwtRows<IDatenN>(updatedEwtRows, {
    storageKey: 'dataN',
    tableId: 'tableN',
    resource: 'N',
    deriveFields: ewt => ({ Beginn: ewt.beginE as string, Ende: ewt.endeE as string }),
  });
}
