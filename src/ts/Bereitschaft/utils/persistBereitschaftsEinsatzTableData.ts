import { aktualisiereBerechnung } from '../../Berechnung';
import type { CustomTable } from '../../class/CustomTable';
import type { IDatenBE } from '../../interfaces';
import Storage from '../../utilities/Storage';
import normalizeResourceRows from '../../utilities/normalizeResourceRows';
import tableToArray from '../../utilities/tableToArray';

export default function persistBereitschaftsEinsatzTableData(ft: CustomTable<IDatenBE>): IDatenBE[] {
  const allRows = normalizeResourceRows<IDatenBE>(tableToArray<IDatenBE>(ft));
  Storage.set('dataBE', allRows);
  aktualisiereBerechnung();
  return allRows;
}
