import type { IDatenEWT } from '../../interfaces';
import type { CustomTable } from '../../class/CustomTable';
import { Storage, tableToArray } from '../../utilities';
import aktualisiereBerechnung from '../../Berechnung/aktualisiereBerechnung';
import normalizeResourceRows from '../../utilities/normalizeResourceRows';

export default function persistEwtTableData(ft: CustomTable<IDatenEWT>, Monat?: number): IDatenEWT[] {
  Monat ??= Storage.get<number>('Monat', { check: true });

  const allRows = normalizeResourceRows<IDatenEWT>(tableToArray<IDatenEWT>(ft));
  Storage.set('dataE', allRows);
  aktualisiereBerechnung();
  return allRows;
}
