import { type JSX } from 'react';

import type { Column, Row } from '@/infrastructure/table/CustomTable';
import { MyDivModal, MyModalBody, MyShowFooter, showModal } from '@/components';
import { createShowElement3, createTagElement, getColumn } from '@/components/showModalHelpers';
import type { CustomHTMLDivElement, IDatenN } from '@/types';
import { formatNebengeldZulagen, normalizeNebengeldZulagen } from '../utils';
import { DBHeadingH4 } from '@db-ux/react-core-components';

/**
 * Zeigt zwei Spalten der Zeile nebeneinander, getrennt durch `separator` (Standard: Pfeil), z.B. Beginn und Ende.
 *
 * @param row - Anzuzeigende Zeile.
 * @param column_1 - Linke Spalte als `[Spaltenname, CSS-Klasse]`; der Spaltenname ist zugleich die `id` des Spans.
 * @param column_2 - Rechte Spalte, gleiche Form wie `column_1`.
 * @param classNameDiv - CSS-Klassen des umgebenden Divs.
 * @param separator - Element zwischen den beiden Werten.
 * @returns Div mit beiden über den Spalten-`parser` formatierten Werten.
 */
const createShowElement = (
  row: Row<IDatenN>,
  column_1: [columnName: string, className?: string],
  column_2: [columnName: string, className?: string],
  classNameDiv: string = 'mb-2 col-12 text-center',
  separator: JSX.Element = <span className="db-icon db-font-size-lg" data-icon="arrow_right" />,
) => {
  const column1: Column<IDatenN> = getColumn(row, column_1[0]);
  const column2: Column<IDatenN> = getColumn(row, column_2[0]);
  return (
    <div className={classNameDiv}>
      <span className={column_1[1]} id={column1.name}>
        {column1.parser(row.cells[column1.name])}
      </span>
      {separator}
      <span className={column_2[1]} id={column2.name}>
        {column2.parser(row.cells[column2.name])}
      </span>
    </div>
  );
};

/**
 * Zeigt die Zulagen der Zeile (Text aus `formatNebengeldZulagen`) zeilenweise untereinander.
 *
 * @param row - Anzuzeigende Zeile.
 * @param classNameDiv - CSS-Klassen des umgebenden Divs.
 * @returns Div mit einer Zeile je Zulage.
 */
const createZulagenElement = (row: Row<IDatenN>, classNameDiv: string = 'mb-2 col-12 text-center') => {
  const lines = formatNebengeldZulagen(normalizeNebengeldZulagen(row.cells)).split('\n');
  return (
    <div className={classNameDiv}>
      {lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  );
};

/**
 * Öffnet das Anzeige-Modal einer Neben-Zeile (Tag, Auftragsnummer, Arbeitszeit, Zulagen) und hängt die Zeile an das Modal-Element.
 *
 * @param row - Anzuzeigende Zeile.
 * @param titel - Modal-Titel.
 */
export default function ShowModalNeben(row: Row<IDatenN>, titel: string): void {
  const modal: CustomHTMLDivElement<IDatenN> = showModal(
    <MyDivModal
      title={titel}
      Footer={<MyShowFooter row={row} />}
      errorMessage={row.isError ? (row._errorMessage ?? undefined) : undefined}
    >
      <MyModalBody className="p-3">
        {createTagElement(row)}

        <DBHeadingH4 alignment="center" className="mb-0">
          Auftragsnummer
        </DBHeadingH4>
        {createShowElement3(row, ['Auftragsnummer'])}

        <DBHeadingH4 alignment="center" className="mb-0">
          Arbeitszeit
        </DBHeadingH4>
        {createShowElement(row, ['Beginn'], ['Ende'])}

        <DBHeadingH4 alignment="center" className="mb-0">
          Zulagen
        </DBHeadingH4>
        {createZulagenElement(row)}
      </MyModalBody>
    </MyDivModal>,
  );

  modal.row = row;
}
