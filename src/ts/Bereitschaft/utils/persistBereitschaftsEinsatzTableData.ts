import { publishDataChanged } from '../../core';
import type { CustomTable } from '../../class/CustomTable';
import type { IDatenBE } from '../../interfaces';
import Storage from '../../utilities/Storage';
import mergeVisibleResourceRows from '../../utilities/mergeVisibleResourceRows';

export default function persistBereitschaftsEinsatzTableData(ft: CustomTable<IDatenBE>): IDatenBE[] {
  const mergedRows = mergeVisibleResourceRows('BE', ft);
  Storage.set('dataBE', mergedRows);
  publishDataChanged();
  return mergedRows;
}
