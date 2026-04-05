import { aktualisiereBerechnung } from '../../Berechnung';
import type { CustomTable } from '../../class/CustomTable';
import type { IDatenBZ } from '../../interfaces';
import Storage from '../../utilities/Storage';
import normalizeResourceRows from '../../utilities/normalizeResourceRows';
import tableToArray from '../../utilities/tableToArray';

export default function persistBereitschaftsZeitraumTableData(ft: CustomTable<IDatenBZ>): IDatenBZ[] {
  const allRows = normalizeResourceRows<IDatenBZ>(tableToArray<IDatenBZ>(ft));
  Storage.set('dataBZ', allRows);
  aktualisiereBerechnung();
  return allRows;
}
