import type { IDatenN, IDatenNJahr } from '../../interfaces';
import type { CustomTable } from '../../class/CustomTable';
import { Storage, tableToArray } from '../../utilities';
import aktualisiereBerechnung from '../../Berechnung/aktualisiereBerechnung';

export default function saveTableDataN(ft: CustomTable<IDatenN>, Monat?: number): IDatenNJahr {
  Monat ??= Storage.get<number>('Monat', { check: true });
  const Jahr = Storage.get<number>('Jahr', { check: true, default: 2024 });
  if (Jahr < 2024) return Storage.get<IDatenNJahr>('dataN', { default: {} as IDatenNJahr });

  const nData: IDatenNJahr = Storage.get<IDatenNJahr>('dataN', { default: {} as IDatenNJahr });
  nData[Monat] = tableToArray<IDatenN>(ft);
  Storage.set('dataN', nData);
  aktualisiereBerechnung();
  return nData;
}
