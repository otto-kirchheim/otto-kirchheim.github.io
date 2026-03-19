import type { IDatenEWT, IDatenEWTJahr } from '../../interfaces';
import type { CustomTable } from '../../class/CustomTable';
import { Storage, tableToArray } from '../../utilities';
import aktualisiereBerechnung from '../../Berechnung/aktualisiereBerechnung';

export default function saveTableDataEWT(ft: CustomTable<IDatenEWT>, Monat?: number): IDatenEWTJahr {
  Monat ??= Storage.get<number>('Monat', { check: true });

  const ewtData: IDatenEWTJahr = Storage.get<IDatenEWTJahr>('dataE', { default: {} as IDatenEWTJahr });
  ewtData[Monat] = tableToArray<IDatenEWT>(ft);
  Storage.set('dataE', ewtData);
  aktualisiereBerechnung();
  return ewtData;
}
