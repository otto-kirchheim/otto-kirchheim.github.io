import Modal from 'bootstrap/js/dist/modal';
import { createRef } from 'preact';
import type { Column } from '../../class/CustomTable';
import { CustomTable, Row } from '../../class/CustomTable';
import { createSnackBar } from '../../class/CustomSnackbar';
import { MyFormModal, MyInput, MyModalBody, showModal } from '../../components';
import type { CustomHTMLDivElement, IDatenN } from '../../interfaces';
import { Storage, checkMaxTag } from '../../utilities';
import dayjs from '../../utilities/configDayjs';
import { persistNebengeldTableData } from '../utils';

const getColumn = (row: CustomTable<IDatenN> | Row<IDatenN>, columnName: string): Column<IDatenN> => {
  const column = row.columns.array.find(column => column.name === columnName);
  if (!column) throw Error(`Spalte ${columnName} nicht gefunden`);
  return column;
};

const createTimeElement = (
  row: CustomTable<IDatenN> | Row<IDatenN>,
  columnName: string,
  options?: { required?: boolean },
) => {
  const column = getColumn(row, columnName);
  return (
    <MyInput
      divClass="form-floating col-6 pb-3"
      type={column.type ?? 'time'}
      id={column.name}
      name={column.longTitle}
      value={row instanceof Row ? row.cells[column.name] : ''}
      {...options}
    >
      {column.longTitle}
    </MyInput>
  );
};

const createTextElement = (row: CustomTable<IDatenN> | Row<IDatenN>, columnName: string) => {
  const column = getColumn(row, columnName);
  return (
    <MyInput
      divClass="form-floating col-6 pb-3"
      type={column.type ?? 'text'}
      id={column.name}
      name={column.longTitle}
      value={row instanceof Row ? row.cells[column.name] : undefined}
      minLength={9}
      maxLength={9}
      required
    >
      {column.longTitle}
    </MyInput>
  );
};

const createNumberElement = (row: CustomTable<IDatenN> | Row<IDatenN>, columnName: string) => {
  const column = getColumn(row, columnName);
  return (
    <MyInput
      divClass="form-floating col-6 pb-3"
      type={column.type ?? 'number'}
      id={column.name}
      name={column.longTitle}
      value={row instanceof Row ? row.cells[column.name] : 1}
      required
      min={'0'}
      max={'1'}
    >
      {column.longTitle}
    </MyInput>
  );
};

export default function EditorModalNeben(row: CustomTable<IDatenN> | Row<IDatenN>, titel: string): void {
  const ref = createRef<HTMLFormElement>();

  const Monat: number = Storage.get<number>('Monat', { check: true }) - 1;
  const Jahr: number = Storage.get<number>('Jahr', { check: true });

  let datum: dayjs.Dayjs;
  if (row instanceof Row) {
    datum = dayjs(row.cells.tagN, 'DD.MM.YYYY');
  } else if (row instanceof CustomTable) {
    datum = dayjs([Jahr, Monat, checkMaxTag(Jahr, Monat)]);
  } else throw new Error('unbekannter Fehler');

  const modal: CustomHTMLDivElement<IDatenN> = showModal(
    <MyFormModal
      myRef={ref}
      title={titel}
      submitText={row instanceof Row ? 'Speichern' : undefined}
      onSubmit={onSubmit()}
    >
      <MyModalBody>
        <MyInput
          divClass="form-floating col-6 pb-3"
          required
          type="date"
          id="tagN"
          name={row.columns.array.find(column => column.name === 'tagN')?.title ?? 'Tag'}
          min={datum.startOf('M').format('YYYY-MM-DD')}
          max={datum.endOf('M').format('YYYY-MM-DD')}
          value={datum.format('YYYY-MM-DD')}
        >
          {row.columns.array.find(column => column.name === 'tagN')?.title ?? 'Tag'}
        </MyInput>

        {createTextElement(row, 'auftragN')}

        {['beginN', 'endeN'].map(value => createTimeElement(row, value, { required: true }))}

        {<h4 className="text-center mb-1">Zulagen</h4>}
        {createNumberElement(row, 'anzahl040N')}
      </MyModalBody>
    </MyFormModal>,
  );

  if (ref.current === null) throw new Error('referenz nicht gesetzt');
  const form = ref.current;

  modal.row = row;

  function onSubmit(): (event: Event) => void {
    return (event: Event): void => {
      if (!form.checkValidity()) return;
      event.preventDefault();

      const row = modal.row;
      if (!row) throw new Error('Row nicht gefunden');
      const table = row instanceof Row ? row.CustomTable : row;

      const values: IDatenN = {
        _id: row instanceof Row ? row.cells._id : undefined,
        ewtRef: row instanceof Row ? row.cells.ewtRef : undefined,
        tagN: dayjs(form.querySelector<HTMLInputElement>('#tagN')?.value ?? 0).format('DD.MM.YYYY'),
        beginN: form.querySelector<HTMLInputElement>('#beginN')?.value ?? '',
        endeN: form.querySelector<HTMLInputElement>('#endeN')?.value ?? '',
        auftragN: form.querySelector<HTMLInputElement>('#auftragN')?.value ?? '',
        anzahl040N: Number(form.querySelector<HTMLInputElement>('#anzahl040N')?.value) || 1,
      };

      const hasDuplicateDay = table.rows.array.some(existingRow => {
        if (existingRow._state === 'deleted') return false;
        if (row instanceof Row && existingRow === row) return false;
        return existingRow.cells.tagN === values.tagN;
      });

      if (hasDuplicateDay) {
        createSnackBar({
          message: 'Nebenbezug<br/>Für diesen Tag existiert bereits ein Eintrag.',
          status: 'warning',
          timeout: 4000,
          fixed: true,
        });
        return;
      }

      if (row instanceof Row) row.val(values);
      else row.rows.add(values);

      Modal.getInstance(modal)?.hide();
      persistNebengeldTableData(table);
    };
  }
}
