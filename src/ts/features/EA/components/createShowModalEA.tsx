import type { Column, Row } from '@/infrastructure/table/CustomTable';
import { MyDivModal, MyModalBody, MyShowElement, MyShowFooter, showModal } from '@/components';
import type { CustomHTMLDivElement, IDatenEA } from '@/types';

const getColumn = (row: Row<IDatenEA>, columnName: string): Column<IDatenEA> => {
  const column = row.columns.array.find(column => column.name === columnName);
  if (!column) throw Error(`Spalte ${columnName} nicht gefunden`);
  return column;
};

const createTagElement = (row: Row<IDatenEA>) => {
  const column: Column<IDatenEA> = getColumn(row, 'Tag');
  return (
    <MyShowElement
      divClass="mb-2 col-12 text-center"
      labelClass="pe-3 align-middle col-form-label text-wrap fw-bold"
      spanClass="align-middle my-auto"
      title={`${column.longTitle}:`}
      id={column.name}
      text={column.parser(row.cells[column.name])}
    />
  );
};

const createShowElement3 = (
  row: Row<IDatenEA>,
  column: [columnName: string, className?: string],
  classNameDiv: string = 'mb-2 col-12 text-center',
) => {
  const column1: Column<IDatenEA> = getColumn(row, column[0]);

  return (
    <div className={classNameDiv}>
      <span className={column[1]} id={column1.name}>
        {column1.parser(row.cells[column1.name])}
      </span>
    </div>
  );
};

export default function ShowModalEA(row: Row<IDatenEA>, titel: string): void {
  const modal: CustomHTMLDivElement<IDatenEA> = showModal(
    <MyDivModal
      size="sm"
      title={titel}
      Footer={<MyShowFooter row={row} />}
      errorMessage={row.isError ? (row._errorMessage ?? undefined) : undefined}
    >
      <MyModalBody className="p-3">
        {createTagElement(row)}

        <h4 className="text-center mb-0">Dauer</h4>
        {createShowElement3(row, ['Dauer'])}

        <h4 className="text-center mb-0">Tätigkeit</h4>
        {createShowElement3(row, ['Taetigkeit'])}

        <h4 className="text-center mb-0">Entgeltgruppe</h4>
        {createShowElement3(row, ['Entgeltgruppe'])}
      </MyModalBody>
    </MyDivModal>,
  );

  modal.row = row;
}
