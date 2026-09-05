import Modal from 'bootstrap/js/dist/modal';
import { createRef, type SubmitEvent } from 'react';

import { Row } from '@/infrastructure/table/CustomTable';
import type { CustomTable } from '@/infrastructure/table/CustomTable';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { MyButton, MyCheckbox, MyFormModal, MyInput, MyModalBody, MySelect, showModal } from '@/components';
import type { CustomHTMLDivElement, IDatenEWT, IVorgabenU } from '@/types';
import { default as Storage } from '@/infrastructure/storage/Storage';
import dayjs from '@/infrastructure/date/configDayjs';

function buildSchichtOptionen(vorgabenU: IVorgabenU): { value: string; text: string; selected?: boolean }[] {
  const { Arbeitszeit: aZ } = vorgabenU;
  const freitagEnde = aZ.frueh.overrides?.[5]?.ende;
  const fruehLabel = freitagEnde
    ? `Früh | ${aZ.frueh.default.beginn}–${aZ.frueh.default.ende} / Fr: ${freitagEnde}`
    : `Früh | ${aZ.frueh.default.beginn}–${aZ.frueh.default.ende}`;

  return [
    { value: 'T', text: fruehLabel, selected: true },
    ...(aZ.spaet.aktiv ? [{ value: 'SP', text: `Spät | ${aZ.spaet.default.beginn}–${aZ.spaet.default.ende}` }] : []),
    ...(aZ.nacht.aktiv ? [{ value: 'N', text: `Nacht | ${aZ.nacht.default.beginn}–${aZ.nacht.default.ende}` }] : []),
    ...(aZ.sonder.aktiv ? [{ value: 'S', text: `Sonder | ${aZ.sonder.beginn}–${aZ.sonder.ende}` }] : []),
  ];
}
import {
  calculateBuchungstagEwt,
  calculateEwtEintraege,
  clearEwtZeiten,
  getEwtDaten,
  getEwtEditorDate,
  getEwtWindow,
  persistEwtTableData,
  validateEwtZeitenReihenfolge,
} from '../utils';

const ZEITFELDER = ['abWE', 'beginE', 'ab1E', 'anEE', 'abEE', 'an1E', 'endeE', 'anWE'] as const;
const getZeitfehlerElementId = (feld: (typeof ZEITFELDER)[number]): string => `zeitfehler-${feld}`;

const createTimeElement = (row: CustomTable<IDatenEWT> | Row<IDatenEWT>, columnName: string) => {
  const column = row.columns.array.find(column => column.name === columnName);
  if (!column) throw Error(`Spalte ${columnName} nicht gefunden`);
  return (
    <MyInput
      divClass="form-floating col-6"
      type="time"
      id={column.name}
      name={column.title}
      value={row instanceof Row ? (row.cells[column.name]?.toString() ?? '') : ''}
      invalidFeedbackId={getZeitfehlerElementId(column.name as (typeof ZEITFELDER)[number])}
    >
      {column.title}
    </MyInput>
  );
};

export default function EditorModalEWT(row: CustomTable<IDatenEWT> | Row<IDatenEWT>, titel: string): void {
  const ref = createRef<HTMLFormElement>();
  const buchungstagHinweisRef = createRef<HTMLDivElement>();
  const buchungstagHinweisTextRef = createRef<HTMLInputElement>();

  const vorgabenU: IVorgabenU = Storage.get('VorgabenU', { check: true });

  const Monat: number = Storage.get<number>('Monat', { check: true }) - 1;
  const Jahr: number = Storage.get<number>('Jahr', { check: true });
  const rowCells = row instanceof Row ? row.cells : undefined;

  const datum = getEwtEditorDate(rowCells, Jahr, Monat);
  const initialBuchungstagInputValue = dayjs(rowCells?.Buchungstag || datum).format('YYYY-MM-DD');

  const customButtons =
    row instanceof Row ? (
      <MyButton
        key="Zeitenloeschen"
        className="btn btn-danger"
        text="Zeiten löschen"
        clickHandler={() => clearEwtZeiten(modal)}
      />
    ) : undefined;

  const modal: CustomHTMLDivElement<IDatenEWT> = showModal(
    <MyFormModal
      myRef={ref}
      size="fullscreen-sm-down"
      title={titel}
      submitText={row instanceof Row ? 'Speichern' : undefined}
      helpContext={row instanceof Row ? 'modal.ewtEintrag.edit' : 'modal.ewtEintrag.add'}
      errorMessage={row instanceof Row && row.isError ? (row._errorMessage ?? undefined) : undefined}
      customButtons={[customButtons]}
      onSubmit={onSubmit()}
    >
      <MyModalBody>
        <MyInput
          divClass="form-floating col-12 col-sm-5"
          required
          type="date"
          id="Tag"
          name={row.columns.array.find(column => column.name === 'Tag')?.title ?? 'Tag'}
          min={datum.startOf('M').format('YYYY-MM-DD')}
          max={datum.endOf('M').format('YYYY-MM-DD')}
          value={datum.format('YYYY-MM-DD')}
        >
          {row.columns.array.find(column => column.name === 'Tag')?.title ?? 'Tag'}
        </MyInput>

        <div ref={buchungstagHinweisRef} id="buchungstagHinweisEdit" className="col-12 col-sm-6 d-none">
          <MyInput
            myRef={buchungstagHinweisTextRef}
            disabled
            type="date"
            id="Buchungstag"
            name={row.columns.array.find(column => column.name === 'Buchungstag')?.title ?? 'Buchungstag'}
            value={initialBuchungstagInputValue}
          >
            {row.columns.array.find(column => column.name === 'Buchungstag')?.title ?? 'Buchungstag'}
          </MyInput>
        </div>
        <MySelect
          className="form-floating col-12 col-sm-7"
          id="Einsatzort"
          title={row.columns.array.find(column => column.name === 'Einsatzort')?.title ?? 'Einsatzort'}
          value={row instanceof Row ? row.cells['Einsatzort'].toString() : undefined}
          options={[
            { text: '', selected: true },
            ...vorgabenU.Fahrzeit.map(ort => {
              return {
                value: ort.key,
                text: ort.key,
              };
            }),
          ]}
        />
        <MySelect
          className="form-floating col-12 col-sm-7"
          required
          id={'Schicht'}
          title={row.columns.array.find(column => column.name === 'Schicht')?.title ?? 'Schicht'}
          value={row instanceof Row ? row.cells['Schicht'].toString() : undefined}
          options={buildSchichtOptionen(vorgabenU)}
        />
        <div className="col-12 col-sm-4">
          <MyCheckbox
            className="form-check form-switch"
            id={'berechnen'}
            checked={row instanceof Row ? row.cells['berechnen'] : true}
          >
            {row.columns.array.find(column => column.name === 'berechnen')?.title ?? 'Berechnen?'}
          </MyCheckbox>
        </div>

        <div className="col-12 position-relative d-flex text-muted">
          <div className="w-50 text-center">
            <span className="material-icons-round small-icons">arrow_downward</span>
          </div>
          <div className="w-50 text-center">
            <span className="material-icons-round small-icons">arrow_upward</span>
          </div>
          <span className="fw-semibold text-uppercase position-absolute top-50 start-50 translate-middle">Wohnung</span>
        </div>
        {createTimeElement(row, 'abWE')}
        {createTimeElement(row, 'anWE')}

        <p className="col-12 text-center text-muted fw-semibold text-uppercase mb-0">Arbeitszeit</p>
        {createTimeElement(row, 'beginE')}
        {createTimeElement(row, 'endeE')}

        <p className="col-12 text-center text-muted fw-semibold text-uppercase mb-0">1. Tätigkeitsstätte</p>
        {createTimeElement(row, 'ab1E')}
        {createTimeElement(row, 'an1E')}

        <p className="col-12 text-center text-muted fw-semibold text-uppercase mb-0">Einsatzort</p>
        {createTimeElement(row, 'anEE')}
        {createTimeElement(row, 'abEE')}

        <div className="col-12 position-relative d-flex text-muted">
          <div className="w-50 text-center">
            <span className="material-icons-round small-icons">arrow_downward</span>
          </div>
          <div className="w-50 text-center">
            <span className="material-icons-round small-icons">arrow_upward</span>
          </div>
        </div>
      </MyModalBody>
    </MyFormModal>,
  );

  if (ref.current === null) throw new Error('referenz nicht gesetzt');
  const form = ref.current;

  const getFormValues = (): IDatenEWT => {
    let values: IDatenEWT = {
      _id: rowCells?._id,
      Tag: form.querySelector<HTMLInputElement>('#Tag')?.value ?? '',
      Buchungstag: '',
      Einsatzort: form.querySelector<HTMLInputElement>('#Einsatzort')?.value ?? '',
      Schicht: form.querySelector<HTMLInputElement>('#Schicht')?.value ?? '',
      abWE: form.querySelector<HTMLInputElement>('#abWE')?.value ?? '',
      ab1E: form.querySelector<HTMLInputElement>('#ab1E')?.value ?? '',
      anEE: form.querySelector<HTMLInputElement>('#anEE')?.value ?? '',
      beginE: form.querySelector<HTMLInputElement>('#beginE')?.value ?? '',
      endeE: form.querySelector<HTMLInputElement>('#endeE')?.value ?? '',
      abEE: form.querySelector<HTMLInputElement>('#abEE')?.value ?? '',
      an1E: form.querySelector<HTMLInputElement>('#an1E')?.value ?? '',
      anWE: form.querySelector<HTMLInputElement>('#anWE')?.value ?? '',
      berechnen: form.querySelector<HTMLInputElement>('#berechnen')?.checked ?? true,
    };

    const calculatedValues = calculateEwtEintraege(vorgabenU, [{ ...values }])[0];
    if (calculatedValues) {
      values = { ...calculatedValues };
    }

    values.Buchungstag = calculateBuchungstagEwt(values);
    return values;
  };

  const updateBuchungstagAnzeige = (): void => {
    if (!buchungstagHinweisRef.current) return;

    const tag = form.querySelector<HTMLInputElement>('#Tag')?.value ?? '';
    if (!tag) {
      buchungstagHinweisRef.current.classList.add('d-none');
      return;
    }

    const values = getFormValues();
    const istGleich = dayjs(values.Buchungstag).isSame(dayjs(values.Tag), 'day');

    if (istGleich) {
      buchungstagHinweisRef.current.classList.add('d-none');
      return;
    }

    if (buchungstagHinweisTextRef.current) {
      buchungstagHinweisTextRef.current.value = dayjs(values.Buchungstag).format('YYYY-MM-DD');
    }
    buchungstagHinweisRef.current.classList.remove('d-none');
  };

  const clearZeitfehler = (): void => {
    ZEITFELDER.forEach(feld => {
      const input = form.querySelector<HTMLInputElement>(`#${feld}`);
      const feedback = form.querySelector<HTMLDivElement>(`#${getZeitfehlerElementId(feld)}`);
      if (!input) return;
      input.setCustomValidity('');
      input.classList.remove('is-invalid');
      if (feedback) feedback.textContent = '';
    });
  };

  const showZeitfehlerPopup = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement | null;
    if (!input) return;
    if (!input.classList.contains('is-invalid')) return;
    if (!input.validationMessage) return;
    input.reportValidity();
  };

  ZEITFELDER.forEach(feld => {
    const input = form.querySelector<HTMLInputElement>(`#${feld}`);
    if (!input) return;
    input.addEventListener('input', clearZeitfehler);
    input.addEventListener('change', clearZeitfehler);
    input.addEventListener('click', showZeitfehlerPopup);
    input.addEventListener('focus', showZeitfehlerPopup);
    input.addEventListener('input', updateBuchungstagAnzeige);
    input.addEventListener('change', updateBuchungstagAnzeige);
  });

  ['Tag', 'Einsatzort', 'Schicht', 'berechnen'].forEach(fieldId => {
    const input = form.querySelector<HTMLInputElement | HTMLSelectElement>(`#${fieldId}`);
    if (!input) return;
    input.addEventListener('change', updateBuchungstagAnzeige);
  });

  updateBuchungstagAnzeige();

  modal.row = row;

  function onSubmit(): (event: SubmitEvent<HTMLFormElement>) => void {
    return (event: SubmitEvent<HTMLFormElement>): void => {
      event.preventDefault();
      clearZeitfehler();

      if (!form.checkValidity()) return;

      const row = modal.row;
      if (!row) throw new Error('Row nicht gefunden');
      const table: CustomTable<IDatenEWT> = row instanceof Row ? row.CustomTable : row;

      const values: IDatenEWT = getFormValues();

      const zeitFehler = validateEwtZeitenReihenfolge(values);
      if (zeitFehler && zeitFehler.length > 0) {
        console.log(JSON.stringify({ Fehler: zeitFehler, Values: values }));
        for (const fehler of zeitFehler) {
          const invalidInput = form.querySelector<HTMLInputElement>(`#${fehler.feld}`);
          const feedback = form.querySelector<HTMLDivElement>(`#${getZeitfehlerElementId(fehler.feld)}`);
          if (!invalidInput) continue;
          invalidInput.setCustomValidity(fehler.message);
          invalidInput.classList.add('is-invalid');
          if (feedback) feedback.textContent = fehler.message;
        }

        const firstInvalidInput = form.querySelector<HTMLInputElement>(`#${zeitFehler[0].feld}`);
        if (firstInvalidInput) {
          firstInvalidInput.reportValidity();
          firstInvalidInput.focus();
        }
        return;
      }

      const currentWindow = getEwtWindow(values);
      // Beim Neuanlegen: Statt eines separaten Delete+Create eine bereits zum Löschen vorgemerkte,
      // zeitlich überschneidende Zeile reaktivieren (bleibt als Update erhalten — Vorbild:
      // `addEwtTag.ts`. Erhält dabei die ursprüngliche `_id`, sodass z. B. eine verknüpfte
      // Nebengeld-Referenz (`EWT`) nicht verwaist).
      let deletedRowToReactivate: Row<IDatenEWT> | undefined;

      if (currentWindow) {
        const conflictingEntry = getEwtDaten(undefined, undefined, { excludeDeleted: true }).find(existing => {
          if (values._id && existing._id === values._id) return false;
          const existingWindow = getEwtWindow(existing);
          if (!existingWindow) return false;
          return currentWindow.start.isBefore(existingWindow.end) && existingWindow.start.isBefore(currentWindow.end);
        });

        if (conflictingEntry) {
          const schichtHinweis = ['N', 'BN'].includes(conflictingEntry.Schicht)
            ? ` (${conflictingEntry.Schicht}-Schicht beginnt am Vortag)`
            : '';
          createSnackBar({
            message: `EWT<br/>Zeitüberschneidung mit Tag ${dayjs(conflictingEntry.Tag).format('DD.MM.')}${schichtHinweis}.`,
            status: 'warning',
            timeout: 5000,
            fixed: true,
          });
          return;
        }

        if (!(row instanceof Row)) {
          deletedRowToReactivate = table.rows.array.find(existingRow => {
            if (existingRow._state !== 'deleted') return false;
            const existingWindow = getEwtWindow(existingRow.cells);
            if (!existingWindow) return false;
            return currentWindow.start.isBefore(existingWindow.end) && existingWindow.start.isBefore(currentWindow.end);
          });
        }
      }

      const hasExactDuplicate = table.rows.array.some(existingRow => {
        if (existingRow._state === 'deleted') return false;
        if (row instanceof Row && existingRow === row) return false;

        const existing = existingRow.cells;
        return (
          existing.Tag === values.Tag &&
          existing.Buchungstag === values.Buchungstag &&
          existing.Einsatzort === values.Einsatzort &&
          existing.Schicht === values.Schicht &&
          existing.abWE === values.abWE &&
          existing.ab1E === values.ab1E &&
          existing.anEE === values.anEE &&
          existing.beginE === values.beginE &&
          existing.endeE === values.endeE &&
          existing.abEE === values.abEE &&
          existing.an1E === values.an1E &&
          existing.anWE === values.anWE &&
          existing.berechnen === values.berechnen
        );
      });

      if (hasExactDuplicate) {
        createSnackBar({
          message: 'EWT<br/>Ein identischer Eintrag ist bereits vorhanden.',
          status: 'warning',
          timeout: 4000,
          fixed: true,
        });
        return;
      }

      if (row instanceof Row) row.val(values);
      else if (deletedRowToReactivate) {
        deletedRowToReactivate.undoDelete();
        deletedRowToReactivate.val(values);
      } else row.rows.add(values);

      Modal.getInstance(modal)?.hide();
      persistEwtTableData(table);
    };
  }
}
