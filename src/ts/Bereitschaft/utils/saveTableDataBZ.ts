import { aktualisiereBerechnung } from '../../Berechnung';
import type { CustomTable } from '../../class/CustomTable';
import type { IDatenBZ, IDatenBZJahr } from '../../interfaces';
import Storage from '../../utilities/Storage';
import tableToArray from '../../utilities/tableToArray';

export default function saveTableDataBZ(ft: CustomTable<IDatenBZ>, Monat?: number): IDatenBZJahr {
  Monat ??= Storage.get<number>('Monat', { check: true });

  const bzData: IDatenBZJahr = Storage.get<IDatenBZJahr>('dataBZ', { default: {} as IDatenBZJahr });
  bzData[Monat] = tableToArray<IDatenBZ>(ft);
  Storage.set('dataBZ', bzData);
  aktualisiereBerechnung();
  return bzData;
}
