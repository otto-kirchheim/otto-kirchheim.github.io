import type { IVorgabenU, IVorgabenUvorgabenB } from '@/types';
import type { CustomTable } from '@/infrastructure/table/CustomTable';
import { default as Storage } from '@/infrastructure/storage/Storage';
import { default as tableToArray } from '@/infrastructure/data/tableToArray';

export default function saveTableDataVorgabenU(ft: CustomTable<IVorgabenUvorgabenB>): IVorgabenU {
  const vorgabenU: IVorgabenU = Storage.get<IVorgabenU>('VorgabenU', { check: true });
  vorgabenU.vorgabenB = Object.fromEntries(tableToArray<IVorgabenUvorgabenB>(ft).entries());
  Storage.set('VorgabenU', vorgabenU);
  return vorgabenU;
}
