import type { IDatenN } from '../../../interfaces';
import type { CustomTable } from '../../../class/CustomTable';
import { Storage } from '../../../utilities';
import { publishDataChanged } from '../../../core';
import normalizeResourceRows from '../../../infrastructure/data/normalizeResourceRows';
import mergeVisibleResourceRows from '../../../infrastructure/data/mergeVisibleResourceRows';
import dayjs from '../../../infrastructure/date/configDayjs';

export default function persistNebengeldTableData(ft: CustomTable<IDatenN>): IDatenN[] {
  const Jahr = Storage.get<number>('Jahr', { check: true, default: dayjs().year() });
  if (Jahr < 2024) return normalizeResourceRows<IDatenN>(Storage.get<unknown>('dataN', { default: [] }));

  const mergedRows = mergeVisibleResourceRows('N', ft);
  Storage.set('dataN', mergedRows);
  publishDataChanged();
  return mergedRows;
}
