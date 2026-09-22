import type { Column, CustomTableTypes, Row } from '@/shared/ui/custom-table/CustomTable';
import { MyDivModal, MyModalBody, MyShowFooter, showModal } from '@/components';
import type { CustomHTMLDivElement, IDatenBE, IDatenBZ } from '@/types';

/**
 * Baut eine Anzeigezeile (Beschriftung und Wert) für eine Spalte.
 *
 * @typeParam T - Zeilentyp (BZ oder BE).
 * @param column - Tabellenspalte.
 * @param row - Anzuzeigende Zeile.
 * @returns Beschriftung mit geparstem Wert; `undefined` für die Aktionsspalte.
 */
const createShowElement = <T extends CustomTableTypes = IDatenBZ | IDatenBE>(column: Column<T>, row: Row<T>) => {
  if (column.editing) return;
  return (
    <div className="mb-1 raster" key={column.name}>
      <label className="sp-5 text-wrap fw-bold" htmlFor={column.name}>
        {column.title}
      </label>
      <span className="sp-7 align-middle text-break my-auto" id={column.name}>
        {column.parser(row.cells[column.name] as T[keyof T])}
      </span>
    </div>
  );
};

/**
 * Öffnet ein schreibgeschütztes Modal mit allen Spalten der Zeile.
 *
 * @typeParam T - Zeilentyp (BZ oder BE).
 * @param row - Anzuzeigende Zeile.
 * @param titel - Modal-Titel.
 */
export default function ShowModalBereitschaft<T extends CustomTableTypes = IDatenBZ | IDatenBE>(
  row: Row<T>,
  titel: string,
): void {
  const modal: CustomHTMLDivElement<T> = showModal<T>(
    <MyDivModal
      title={titel}
      Footer={<MyShowFooter row={row} />}
      errorMessage={row.isError ? (row._errorMessage ?? undefined) : undefined}
    >
      <MyModalBody>{row.columns.array.map(column => createShowElement<T>(column, row))}</MyModalBody>
    </MyDivModal>,
  );

  modal.row = row;
}
