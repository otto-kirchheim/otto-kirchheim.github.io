import type { IDatenEWT, IDatenN } from '@/types';
import { syncFieldsFromEwtRows } from '@/infrastructure/data/syncFieldsFromEwtRows';

export default function syncNebengeldTimesFromEwtRows(updatedEwtRows: IDatenEWT[]): void {
  syncFieldsFromEwtRows<IDatenN>(updatedEwtRows, {
    storageKey: 'dataN',
    tableId: 'tableN',
    resource: 'N',
    deriveFields: ewt => ({ Beginn: ewt.beginE as string, Ende: ewt.endeE as string }),
  });
}
