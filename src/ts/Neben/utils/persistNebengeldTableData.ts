import type { IDatenN } from '../../interfaces';
import type { CustomTable } from '../../class/CustomTable';
import { Storage, tableToArray } from '../../utilities';
import aktualisiereBerechnung from '../../Berechnung/aktualisiereBerechnung';
import normalizeResourceRows from '../../utilities/normalizeResourceRows';

export default function persistNebengeldTableData(ft: CustomTable<IDatenN>, Monat?: number): IDatenN[] {
  Monat ??= Storage.get<number>('Monat', { check: true });
  const Jahr = Storage.get<number>('Jahr', { check: true, default: 2024 });
  if (Jahr < 2024) return normalizeResourceRows<IDatenN>(Storage.get<unknown>('dataN', { default: [] }));

  const allRows = normalizeResourceRows<IDatenN>(tableToArray<IDatenN>(ft));
  Storage.set('dataN', allRows);
  aktualisiereBerechnung();
  return allRows;
}
