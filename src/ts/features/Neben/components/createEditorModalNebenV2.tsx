import Modal from 'bootstrap/js/dist/modal';
import { createRef } from 'preact';
import type { Column } from '@/infrastructure/table/CustomTable';
import { CustomTable, Row } from '@/infrastructure/table/CustomTable';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { MyFormModal, MyInput, MyModalBody, MySelect, showModal } from '@/components';
import { getEwtDaten } from '../../EWT/utils';
import type { CustomHTMLDivElement, IDatenEWT, IDatenN } from '@/types';
import Storage from '@/infrastructure/storage/Storage';
import { default as checkMaxTag } from '@/infrastructure/validation/checkMaxTag';
import dayjs from '@/infrastructure/date/configDayjs';
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

  const dataE = getEwtDaten(undefined, undefined, { scope: 'monat', filter: 'starttag' });
  const ewtMap = new Map<string, IDatenEWT>(dataE.filter(e => e._id).map(e => [e._id as string, e]));

  const currentEwtRef = row instanceof Row ? row.cells.ewtRef : undefined;

  const usedEwtRefs = new Set(
    Storage.get<IDatenN[]>('dataN', { default: [] })
      .filter(n => n.ewtRef && n.ewtRef !== currentEwtRef)
      .map(n => n.ewtRef as string),
  );

  const ewtOptions = [
    { value: '', text: '— keine Zuordnung —', selected: !currentEwtRef },
    ...dataE.map(day => {
      const tag = dayjs(day.tagE).format('DD | dd');
      let text = tag;
      if (day.schichtE === 'N') text = `${tag} | Nacht`;
      else if (day.schichtE === 'BN') text = `${tag} | Nacht / Bereitschaft`;
      return {
        value: day._id ?? '',
        text,
        selected: currentEwtRef === day._id,
        disabled: usedEwtRefs.has(day._id ?? ''),
      };
    }),
  ];

  const handleEwtChange = (evt: Event): void => {
    const select = evt.target as HTMLSelectElement;
    const selectedId = select.value;
    const currentForm = ref.current;
    if (!currentForm) return;
    const tagInput = currentForm.querySelector<HTMLInputElement>('#tagN');
    if (tagInput) tagInput.disabled = Boolean(selectedId);
    if (!selectedId) return;
    const entry = ewtMap.get(selectedId);
    if (!entry) return;
    const beginInput = currentForm.querySelector<HTMLInputElement>('#beginN');
    const endeInput = currentForm.querySelector<HTMLInputElement>('#endeN');
    if (tagInput) tagInput.value = dayjs(entry.tagE).format('YYYY-MM-DD');
    if (beginInput) beginInput.value = entry.beginE as string;
    if (endeInput) endeInput.value = entry.endeE as string;
  };

  const modal: CustomHTMLDivElement<IDatenN> = showModal(
    <MyFormModal
      myRef={ref}
      title={titel}
      submitText={row instanceof Row ? 'Speichern' : undefined}
      onSubmit={onSubmit()}
    >
      <MyModalBody>
        {dataE.length > 0 && (
          <MySelect
            className="form-floating col-12 pb-3"
            id="ewtRefSelect"
            title="EWT-Eintrag (optional)"
            options={ewtOptions}
            changeHandler={handleEwtChange}
          />
        )}

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

  const initialEwtRef = form.querySelector<HTMLSelectElement>('#ewtRefSelect')?.value;
  const tagInput = form.querySelector<HTMLInputElement>('#tagN');
  if (tagInput) tagInput.disabled = Boolean(initialEwtRef);

  modal.row = row;

  function onSubmit(): (event: Event) => void {
    return (event: Event): void => {
      if (!form.checkValidity()) return;
      event.preventDefault();

      const row = modal.row;
      if (!row) throw new Error('Row nicht gefunden');
      const table = row instanceof Row ? row.CustomTable : row;

      const selectedEwtRef = form.querySelector<HTMLSelectElement>('#ewtRefSelect')?.value || undefined;

      const values: IDatenN = {
        _id: row instanceof Row ? row.cells._id : undefined,
        ewtRef: selectedEwtRef,
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
