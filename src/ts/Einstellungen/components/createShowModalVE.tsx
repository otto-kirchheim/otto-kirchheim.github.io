import type { Row } from '../../class/CustomTable';
import { MyDivModal, MyModalBody, MyShowElement, MyShowFooter, showModal } from '../../components';
import type { CustomHTMLDivElement, IVorgabenUvorgabenB } from '../../interfaces';

const createShowElement = (row: Row<IVorgabenUvorgabenB>, columnName: string, falseparser?: false) => {
  const column = row.columns.array.find(column => column.name === columnName);
  if (!column) throw Error(`Spalte ${columnName} nicht gefunden`);
  return (
    <MyShowElement
      divClass="mb-1"
      labelClass="col-3 col-form-label text-wrap fw-bold"
      spanClass="col-9 align-middle text-break my-auto"
      title={`${column.title}:`}
      id={column.name}
      text={column.parser(row.cells[column.name], falseparser)}
    />
  );
};

const createBereitschaftBlock = (row: Row<IVorgabenUvorgabenB>) => {
  return (
    <>
      <div className="col-12 pt-2">
        <h6 className="mb-2">Bereitschaft</h6>
      </div>
      {createShowElement(row, 'beginnB', false)}
      {createShowElement(row, 'endeB', false)}
    </>
  );
};

const createNachtschichtBlock = (row: Row<IVorgabenUvorgabenB>) => {
  const isNacht = Boolean(row.cells.nacht);

  return (
    <>
      <div className="col-12 pt-2">
        <h6 className="mb-2">Nachtschicht</h6>
      </div>
      {createShowElement(row, 'nacht')}
      {isNacht ? (
        <>
          {createShowElement(row, 'beginnN', false)}
          {createShowElement(row, 'endeN', false)}
        </>
      ) : (
        <div className="col-12 small text-body-secondary pb-1">Keine Nachtschicht aktiviert.</div>
      )}
    </>
  );
};

export default function ShowModalVE(row: Row<IVorgabenUvorgabenB>, titel: string): void {
  const modal: CustomHTMLDivElement<IVorgabenUvorgabenB> = showModal<IVorgabenUvorgabenB>(
    <MyDivModal title={titel} Footer={<MyShowFooter row={row} />}>
      <MyModalBody>
        {createShowElement(row, 'Name')}
        {createShowElement(row, 'standard')}
        <hr className="my-2" />
        {createBereitschaftBlock(row)}
        <hr className="my-2" />
        {createNachtschichtBlock(row)}
      </MyModalBody>
    </MyDivModal>,
  );

  modal.row = row;
}
