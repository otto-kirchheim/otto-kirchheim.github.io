import { publishDataChanged } from '../../../core';
import type { CustomTable } from '../../../class/CustomTable';
import type { IDatenBZ } from '../../../interfaces';
import Storage from '../../../infrastructure/storage/Storage';
import mergeVisibleResourceRows from '../../../infrastructure/data/mergeVisibleResourceRows';

export default function persistBereitschaftsZeitraumTableData(ft: CustomTable<IDatenBZ>): IDatenBZ[] {
  const mergedRows = mergeVisibleResourceRows('BZ', ft);
  Storage.set('dataBZ', mergedRows);
  publishDataChanged();
  return mergedRows;
}
