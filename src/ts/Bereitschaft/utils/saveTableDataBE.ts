import { aktualisiereBerechnung } from '../../Berechnung';
import type { CustomTable } from '../../class/CustomTable';
import type { IDatenBE, IDatenBEJahr } from '../../interfaces';
import Storage from '../../utilities/Storage';
import tableToArray from '../../utilities/tableToArray';

export default function saveTableDataBE(ft: CustomTable<IDatenBE>, Monat?: number): IDatenBEJahr {
  Monat ??= Storage.get<number>('Monat', { check: true });

  const beData: IDatenBEJahr = Storage.get<IDatenBEJahr>('dataBE', { default: {} as IDatenBEJahr });
  beData[Monat] = tableToArray<IDatenBE>(ft);
  Storage.set('dataBE', beData);
  aktualisiereBerechnung();
  return beData;
}
