import { aktualisiereBerechnung } from '../../Berechnung';
import type { CustomTable } from '../../class/CustomTable';
import type { IDatenBZ } from '../../interfaces';
import Storage from '../../utilities/Storage';
import mergeVisibleResourceRows from '../../utilities/mergeVisibleResourceRows';

export default function persistBereitschaftsZeitraumTableData(ft: CustomTable<IDatenBZ>): IDatenBZ[] {
  const mergedRows = mergeVisibleResourceRows('BZ', ft);
  Storage.set('dataBZ', mergedRows);
  aktualisiereBerechnung();
  return mergedRows;
}
