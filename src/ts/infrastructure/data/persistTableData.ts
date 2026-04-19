import type { CustomTable, CustomTableTypes } from '../../class/CustomTable';
import type { TResourceKey } from '../../interfaces';
import { publishDataChanged } from '../../core';
import Storage from '../storage/Storage';
import dayjs from '../date/configDayjs';
import mergeVisibleResourceRows from './mergeVisibleResourceRows';
import normalizeResourceRows from './normalizeResourceRows';
import { RESOURCE_STORAGE_MAP } from './resourceConfig';

type PersistableResource = Exclude<TResourceKey, 'settings' | 'EWT'>;

export default function persistTableData<T extends CustomTableTypes>(
  resource: PersistableResource,
  ft: CustomTable<T>,
): T[] {
  if (resource === 'N') {
    const Jahr = Storage.get<number>('Jahr', { check: true, default: dayjs().year() });
    if (Jahr < 2024) return normalizeResourceRows<T>(Storage.get<unknown>('dataN', { default: [] }));
  }

  const storageKey = RESOURCE_STORAGE_MAP[resource];
  const mergedRows = mergeVisibleResourceRows(resource, ft);
  Storage.set(storageKey, mergedRows);
  publishDataChanged();
  return mergedRows;
}
