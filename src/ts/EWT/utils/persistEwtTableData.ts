import type { IDatenEWT } from '../../interfaces';
import type { CustomTable } from '../../class/CustomTable';
import { Storage, tableToArray } from '../../utilities';
import aktualisiereBerechnung from '../../Berechnung/aktualisiereBerechnung';
import normalizeResourceRows from '../../utilities/normalizeResourceRows';
import calculateBuchungstagEwt from './calculateBuchungstagEwt';

export default function persistEwtTableData(ft: CustomTable<IDatenEWT>): IDatenEWT[] {
  const allRows = normalizeResourceRows<IDatenEWT>(tableToArray<IDatenEWT>(ft)).map(row => ({
    ...row,
    buchungstagE: calculateBuchungstagEwt(row),
  }));
  Storage.set('dataE', allRows);
  aktualisiereBerechnung();
  return allRows;
}
