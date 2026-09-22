import type { Column, CustomTableTypes, Row } from '@/shared/ui/custom-table/CustomTable';
import MyShowElement from './MyShowElement';

/**
 * Sucht eine Spalte einer Tabellenzeile über ihren Namen.
 *
 * @typeParam T - Zeilentyp der Tabelle.
 * @param row - Tabellenzeile.
 * @param columnName - Spaltenname (`Column.name`).
 * @returns Die gefundene Spalte.
 * @throws {Error} Wenn die Zeile keine Spalte dieses Namens hat.
 */
export function getColumn<T extends CustomTableTypes>(row: Row<T>, columnName: string): Column<T> {
  const column = row.columns.array.find(column => column.name === columnName);
  if (!column) throw Error(`Spalte ${columnName} nicht gefunden`);
  return column;
}

/**
 * Baut die Anzeige des Tages einer Zeile (Spalte `Tag`) für Anzeige-Dialoge.
 *
 * @typeParam T - Zeilentyp der Tabelle.
 * @param row - Tabellenzeile mit einer Spalte `Tag`.
 * @returns Zentrierte Label-Wert-Zeile mit dem geparsten Tageswert.
 * @throws {Error} Wenn die Zeile keine Spalte `Tag` hat.
 */
export function createTagElement<T extends CustomTableTypes>(row: Row<T>) {
  const column = getColumn(row, 'Tag');
  return (
    <MyShowElement
      divClass="mb-2 sp-12 text-center"
      labelClass="pe-3 align-middle text-wrap fw-bold"
      spanClass="align-middle my-auto"
      title={`${column.longTitle}:`}
      id={column.name}
      text={column.parser(row.cells[column.name] as T[keyof T])}
    />
  );
}

/**
 * Zeigt den geparsten Wert einer Spalte ohne Label, zentriert in einem `div`.
 *
 * @typeParam T - Zeilentyp der Tabelle.
 * @param row - Tabellenzeile.
 * @param column - Tupel aus Spaltenname und optionaler Klasse für den Wert-`span`.
 * @param classNameDiv - Klassen des umgebenden `div` (Standard zentriert, volle Breite).
 * @returns Zentrierter Wert der Spalte, vom Parser der Spalte formatiert.
 * @throws {Error} Wenn die Zeile die Spalte nicht hat.
 */
export function createShowElement3<T extends CustomTableTypes>(
  row: Row<T>,
  column: [columnName: string, className?: string],
  classNameDiv: string = 'mb-2 col-12 text-center',
) {
  const column1 = getColumn(row, column[0]);

  return (
    <div className={classNameDiv}>
      <span className={column[1]} id={column1.name}>
        {column1.parser(row.cells[column1.name] as T[keyof T])}
      </span>
    </div>
  );
}
