import type { CustomTableTypes, Row } from '../table/CustomTable';
import { CustomTable } from '../table/CustomTable';
import type { CustomHTMLTableElement } from '@/types';

/**
 * Liefert die Zellen einer Tabelle als Array; soft-gelöschte Zeilen bleiben außen vor.
 *
 * @typeParam T - Zeilentyp der Tabelle.
 * @param ft - Tabelleninstanz oder Id des `<table>`-Elements.
 * @returns Zellen aller nicht gelöschten Zeilen.
 * @throws {Error} Wenn zur Id keine Tabelle im DOM gefunden wird.
 */
export default function tableToArray<T extends CustomTableTypes>(ft: CustomTable<T> | string): T[] {
  if (!(ft instanceof CustomTable)) {
    const table = document.querySelector<CustomHTMLTableElement<T>>(`#${ft}`);
    if (!table) throw new Error('Tabelle nicht gefunden');
    ft = table.instance;
  }
  return ft
    .getRows()
    .filter((row: Row<T>) => row._state !== 'deleted')
    .map((row: Row<T>) => row.cells);
}
