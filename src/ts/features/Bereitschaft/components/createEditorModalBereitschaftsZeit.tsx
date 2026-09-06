import { createRef, type SubmitEvent, type ReactNode } from 'react';

import type { Column } from '@/infrastructure/table/CustomTable';
import { CustomTable, Row } from '@/infrastructure/table/CustomTable';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { MyFormModal, MyInput, MyModalBody, schliesseModal, showModal } from '@/components';
import type { CustomHTMLDivElement, IDatenBZ } from '@/types';
import { default as Storage } from '@/infrastructure/storage/Storage';
import { default as checkMaxTag } from '@/infrastructure/validation/checkMaxTag';
import dayjs from '@/infrastructure/date/configDayjs';
import { getBereitschaftsZeitraumDaten, persistBereitschaftsZeitraumTableData } from '../utils';

const createElementRow = (column: Column<IDatenBZ>, row: Row<IDatenBZ>): ReactNode => {
  let datum: dayjs.Dayjs, min: string, max: string;
  switch (column.name) {
    case 'editing':
      return;
    case 'Beginn':
    case 'Ende':
      datum = dayjs(row.cells[column.name]);
      min = datum.startOf('M').format('YYYY-MM-DDTHH:mm');
      max = datum.add(1, 'M').startOf('M').format('YYYY-MM-DDTHH:mm');
      return (
        <MyInput
          divClass="form-floating col-12"
          type="datetime-local"
          id={column.name}
          name={column.title}
          required
          min={min}
          max={max}
          value={dayjs(row.cells[column.name]).format('YYYY-MM-DDTHH:mm')}
        >
          {column.title}
        </MyInput>
      );
    default:
      return (
        <MyInput
          divClass="form-floating col-12"
          type="number"
          id={column.name}
          name={column.title}
          min={'0'}
          max={'60'}
          value={column.parser(row.cells[column.name])}
        >
          {column.title}
        </MyInput>
      );
  }
};

const createElementCustomtable = (column: Column<IDatenBZ>, Monat: number, Jahr: number): ReactNode => {
  let datum, min, max;
  switch (column.name) {
    case 'editing':
      return;
    case 'Beginn':
    case 'Ende':
      datum = dayjs([Jahr, Monat - 1, checkMaxTag(Jahr, Monat - 1)]);
      min = datum.startOf('M').format('YYYY-MM-DDTHH:mm');
      max = datum.add(1, 'M').startOf('M').format('YYYY-MM-DDTHH:mm');
      return (
        <MyInput
          divClass="form-floating col-12"
          type="datetime-local"
          id={column.name}
          name={column.longTitle}
          required
          min={min}
          max={max}
        >
          {column.longTitle}
        </MyInput>
      );
    default:
      return (
        <MyInput
          divClass="form-floating col-12"
          type="number"
          id={column.name}
          name={column.longTitle}
          min={'0'}
          max={'60'}
        >
          {column.longTitle}
        </MyInput>
      );
  }
};

const createElements = (row: CustomTable<IDatenBZ> | Row<IDatenBZ>): ReactNode => {
  if (row instanceof Row) {
    return row.columns.array.map(column => createElementRow(column, row));
  } else if (row instanceof CustomTable) {
    const Monat: number = Storage.get<number>('Monat', { check: true });
    const Jahr: number = Storage.get<number>('Jahr', { check: true });
    return row.columns.array.map(column => createElementCustomtable(column, Monat, Jahr));
  } else throw new Error('unbekannter Fehler');
};

export default function EditorModalBereitschaftsZeit(row: CustomTable<IDatenBZ> | Row<IDatenBZ>, titel: string): void {
  const ref = createRef<HTMLFormElement>();

  const modal: CustomHTMLDivElement<IDatenBZ> = showModal(
    <MyFormModal
      myRef={ref}
      size="sm"
      title={titel}
      submitText={row instanceof Row ? 'Speichern' : undefined}
      helpContext={row instanceof Row ? 'modal.bereitschaftEintrag.edit' : 'modal.bereitschaftEintrag.add'}
      errorMessage={row instanceof Row && row.isError ? (row._errorMessage ?? undefined) : undefined}
      onSubmit={onSubmit()}
    >
      <MyModalBody>{createElements(row)}</MyModalBody>
    </MyFormModal>,
  );

  if (ref.current === null) throw new Error('referenz nicht gesetzt');
  const form = ref.current;

  modal.row = row;

  function onSubmit(): (event: SubmitEvent<HTMLFormElement>) => void {
    return (event: SubmitEvent<HTMLFormElement>): void => {
      if (!form.checkValidity()) return;
      event.preventDefault();

      const row = modal.row;
      if (!row) throw new Error('Row nicht gefunden');
      const table: CustomTable<IDatenBZ> = row instanceof Row ? row.CustomTable : row;

      const values: IDatenBZ = {
        _id: row instanceof Row ? row.cells._id : undefined,
        Beginn: dayjs(form.querySelector<HTMLInputElement>('#Beginn')?.value).toISOString(),
        Ende: dayjs(form.querySelector<HTMLInputElement>('#Ende')?.value).toISOString(),
        Pause: Number(form.querySelector<HTMLInputElement>('#Pause')?.value),
      };

      const currentStart = dayjs(String(values.Beginn));
      const currentEnd = dayjs(String(values.Ende));
      if (!currentEnd.isAfter(currentStart)) {
        createSnackBar({
          message: 'Bereitschaft<br/>Ende muss nach Beginn liegen.',
          status: 'warning',
          timeout: 3500,
          fixed: true,
        });
        return;
      }

      const overlaps = getBereitschaftsZeitraumDaten(undefined, undefined, { excludeDeleted: true }).some(existing => {
        if (values._id && existing._id === values._id) return false;
        const existingStart = dayjs(String(existing.Beginn));
        const existingEnd = dayjs(String(existing.Ende));
        return currentStart.isBefore(existingEnd) && existingStart.isBefore(currentEnd);
      });

      if (overlaps) {
        createSnackBar({
          message: 'Bereitschaft<br/>Bereitschaftszeiträume dürfen sich nicht überschneiden.',
          status: 'warning',
          timeout: 4000,
          fixed: true,
        });
        return;
      }

      if (row instanceof Row) row.val(values);
      else row.rows.add(values);

      schliesseModal();
      persistBereitschaftsZeitraumTableData(table);
    };
  }
}
