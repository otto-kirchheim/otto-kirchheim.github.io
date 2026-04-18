import type { IVorgabenU, IVorgabenUvorgabenB } from '../../../interfaces';
import type { CustomTable } from '../../../class/CustomTable';
import { Storage, tableToArray } from '../../../utilities';

export default function saveTableDataVorgabenU(ft: CustomTable<IVorgabenUvorgabenB>): IVorgabenU {
  const vorgabenU: IVorgabenU = Storage.get<IVorgabenU>('VorgabenU', { check: true });
  vorgabenU.vorgabenB = Object.fromEntries(tableToArray<IVorgabenUvorgabenB>(ft).entries());
  Storage.set('VorgabenU', vorgabenU);
  return vorgabenU;
}
