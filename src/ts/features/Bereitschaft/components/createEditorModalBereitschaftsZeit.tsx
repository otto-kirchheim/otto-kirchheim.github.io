import { createRef, type SubmitEvent, type ReactNode } from 'react';

import type { Column } from '@/shared/ui/custom-table/CustomTable';
import { CustomTable, Row } from '@/shared/ui/custom-table/CustomTable';
import { createSnackBar } from '@/shared/ui/snackbar/CustomSnackbar';
import { MyFormModal, MyInput, MyModalBody, schliesseModal, showModal } from '@/components';
import type { CustomHTMLDivElement, IDatenBZ } from '@/types';
import { default as Storage } from '@/shared/lib/storage/Storage';
import { default as checkMaxTag } from '@/shared/lib/validation/checkMaxTag';
import dayjs from '@/shared/lib/date/configDayjs';
import { getBereitschaftsZeitraumDaten, persistBereitschaftsZeitraumTableData } from '../utils';

/**
 * Baut das Feld einer Spalte für eine bestehende Zeile: Beginn/Ende als `datetime-local` (Grenzen: Monat des Werts bis Monatsende), sonst Pause in Minuten (0-60).
 *
 * @param column - Tabellenspalte.
 * @param row - Zu bearbeitende Zeile; liefert die Vorbelegung.
 * @returns Eingabefeld; `undefined` für die Aktionsspalte `editing`.
 */
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
          key={column.name}
          divClass="sp-12"
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
          key={column.name}
          divClass="sp-12"
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

/**
 * Baut das Feld einer Spalte für einen neuen Zeitraum (ohne Vorbelegung, Grenzen aus dem gewählten Monat).
 *
 * @param column - Tabellenspalte.
 * @param Monat - Gewählter Monat (1-12).
 * @param Jahr - Gewähltes Jahr.
 * @returns Leeres Eingabefeld; `undefined` für die Aktionsspalte `editing`.
 */
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
          key={column.name}
          divClass="sp-12"
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
          key={column.name}
          divClass="sp-12"
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

/**
 * Baut die Formularfelder des Zeitraum-Modals.
 *
 * @param row - Zeile (Bearbeiten) oder Tabelle (Anlegen).
 * @returns Felder aller Spalten.
 * @throws {Error} Bei unbekanntem `row`-Typ.
 */
const createElements = (row: CustomTable<IDatenBZ> | Row<IDatenBZ>): ReactNode => {
  if (row instanceof Row) {
    return row.columns.array.map(column => createElementRow(column, row));
  } else if (row instanceof CustomTable) {
    const Monat: number = Storage.get<number>('Monat', { check: true });
    const Jahr: number = Storage.get<number>('Jahr', { check: true });
    return row.columns.array.map(column => createElementCustomtable(column, Monat, Jahr));
  } else throw new Error('unbekannter Fehler');
};

/**
 * Öffnet das Modal zum Bearbeiten eines Bereitschaftszeitraums bzw. zum Anlegen (bei Tabelle).
 *
 * @param row - Zu bearbeitende Zeile oder Tabelle (= neuen Zeitraum anlegen).
 * @param titel - Modal-Titel.
 * @throws {Error} Wenn die Formular-Referenz fehlt.
 */
export default function EditorModalBereitschaftsZeit(row: CustomTable<IDatenBZ> | Row<IDatenBZ>, titel: string): void {
  const ref = createRef<HTMLFormElement>();

  const modal: CustomHTMLDivElement<IDatenBZ> = showModal(
    <MyFormModal
      myRef={ref}
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

  /**
   * Baut den Submit-Handler des Formulars.
   *
   * @returns Handler: verlangt Ende nach Beginn und keine Überschneidung mit anderen nicht gelöschten Zeiträumen, schreibt dann in Zeile bzw. Tabelle, schließt das Modal und speichert.
   */
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
