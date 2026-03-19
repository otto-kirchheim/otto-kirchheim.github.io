import type { CustomTableTypes, Row } from '../class/CustomTable';
import { CustomTable } from '../class/CustomTable';
import type { CustomHTMLTableElement } from '../interfaces';

export default function tableToArray<T extends CustomTableTypes>(ft: CustomTable<T> | string): T[] {
  if (!(ft instanceof CustomTable)) {
    const table = document.querySelector<CustomHTMLTableElement<T>>(`#${ft}`);
    if (!table) throw new Error('Tabelle nicht gefunden');
    ft = table.instance;
  }
  // Gelöschte Zeilen (soft-delete) nicht in die Ausgabe einbeziehen
  return ft
    .getRows()
    .filter((row: Row<T>) => row._state !== 'deleted')
    .map((row: Row<T>) => row.cells);
}
