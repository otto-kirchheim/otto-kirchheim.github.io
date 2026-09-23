import type { IVorgabenU, IVorgabenUvorgabenB } from '@/types';
import type { CustomTable } from '@/shared/ui/custom-table/CustomTable';
import { default as Storage } from '@/shared/lib/storage/Storage';
import { default as tableToArray } from '@/shared/lib/ressource/tableToArray';

/**
 * Übernimmt die Zeilen der Voreinstellungs-Tabelle als `VorgabenB` in die gespeicherten `VorgabenU`.
 *
 * @param ft - Tabelle der Bereitschafts-Voreinstellungen (`#tableVE`).
 * @returns Die aktualisierten und im Storage gespeicherten `VorgabenU`.
 */
export default function saveTableDataVorgabenU(ft: CustomTable<IVorgabenUvorgabenB>): IVorgabenU {
  const vorgabenU: IVorgabenU = Storage.get<IVorgabenU>('VorgabenU', { check: true });
  vorgabenU.VorgabenB = Object.fromEntries(tableToArray<IVorgabenUvorgabenB>(ft).entries());
  Storage.set('VorgabenU', vorgabenU);
  return vorgabenU;
}
