import type { Column, CustomTableTypes, Row } from '@/infrastructure/table/CustomTable';
import MyShowElement from './MyShowElement';

export function getColumn<T extends CustomTableTypes>(row: Row<T>, columnName: string): Column<T> {
  const column = row.columns.array.find(column => column.name === columnName);
  if (!column) throw Error(`Spalte ${columnName} nicht gefunden`);
  return column;
}

export function createTagElement<T extends CustomTableTypes>(row: Row<T>) {
  const column = getColumn(row, 'Tag');
  return (
    <MyShowElement
      divClass="mb-2 col-12 text-center"
      labelClass="pe-3 align-middle col-form-label text-wrap fw-bold"
      spanClass="align-middle my-auto"
      title={`${column.longTitle}:`}
      id={column.name}
      text={column.parser(row.cells[column.name] as T[keyof T])}
    />
  );
}

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
