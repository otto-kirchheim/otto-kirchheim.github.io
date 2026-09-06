import { type JSX } from 'react';

import type { Column, Row } from '@/infrastructure/table/CustomTable';
import { MyDivModal, MyModalBody, MyShowFooter, showModal } from '@/components';
import { createShowElement3, createTagElement, getColumn } from '@/components/showModalHelpers';
import type { CustomHTMLDivElement, IDatenN } from '@/types';
import { formatNebengeldZulagen, normalizeNebengeldZulagen } from '../utils';

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

export default function ShowModalNeben(row: Row<IDatenN>, titel: string): void {
  const modal: CustomHTMLDivElement<IDatenN> = showModal(
    <MyDivModal
      title={titel}
      Footer={<MyShowFooter row={row} />}
      errorMessage={row.isError ? (row._errorMessage ?? undefined) : undefined}
    >
      <MyModalBody className="p-3">
        {createTagElement(row)}

        <h4 className="text-center mb-0">Auftragsnummer</h4>
        {createShowElement3(row, ['Auftragsnummer'])}

        <h4 className="text-center mb-0">Arbeitszeit</h4>
        {createShowElement(row, ['Beginn'], ['Ende'])}

        <h4 className="text-center mb-0">Zulagen</h4>
        {createZulagenElement(row)}
      </MyModalBody>
    </MyDivModal>,
  );

  modal.row = row;
}
