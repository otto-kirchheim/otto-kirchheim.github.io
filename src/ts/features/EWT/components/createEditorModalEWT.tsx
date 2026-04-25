import Modal from 'bootstrap/js/dist/modal';
import { createRef } from 'preact';
import { Row } from '../../../infrastructure/table/CustomTable';
import type { CustomTable } from '../../../infrastructure/table/CustomTable';
import { createSnackBar } from '../../../infrastructure/ui/CustomSnackbar';
import { MyButton, MyCheckbox, MyFormModal, MyInput, MyModalBody, MySelect, showModal } from '../../../components';
import type { CustomHTMLDivElement, IDatenEWT, IVorgabenU } from '../../../core/types';
import { default as Storage } from '../../../infrastructure/storage/Storage';
import dayjs from '../../../infrastructure/date/configDayjs';
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
      divClass="form-floating col-6 pb-3"
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
  const initialBuchungstagInputValue = dayjs(rowCells?.buchungstagE || datum).format('YYYY-MM-DD');

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
      customButtons={[customButtons]}
      onSubmit={onSubmit()}
    >
      <MyModalBody>
        <MyInput
          divClass="form-floating col-12 col-sm-5 pb-3"
          required
          type="date"
          id="tagE"
          name={row.columns.array.find(column => column.name === 'tagE')?.title ?? 'Tag'}
          min={datum.startOf('M').format('YYYY-MM-DD')}
          max={datum.endOf('M').format('YYYY-MM-DD')}
          value={datum.format('YYYY-MM-DD')}
        >
          {row.columns.array.find(column => column.name === 'tagE')?.title ?? 'Tag'}
        </MyInput>

        <div ref={buchungstagHinweisRef} id="buchungstagHinweisEdit" className="form-floating col-12 col-sm-6 d-none">
          <MyInput
            divClass="form-floating pb-3"
            myRef={buchungstagHinweisTextRef}
            disabled
            type="date"
            id="buchungstagE"
            name={row.columns.array.find(column => column.name === 'buchungstagE')?.title ?? 'Buchungstag'}
            value={initialBuchungstagInputValue}
          >
            {row.columns.array.find(column => column.name === 'buchungstagE')?.title ?? 'Buchungstag'}
          </MyInput>
        </div>
        <MySelect
          className="form-floating col-12 col-sm-7 pb-3"
          id="eOrtE"
          title={row.columns.array.find(column => column.name === 'eOrtE')?.title ?? 'Einsatzort'}
          value={row instanceof Row ? row.cells['eOrtE'].toString() : undefined}
          options={[
            { text: '', selected: true },
            ...vorgabenU.fZ.map(ort => {
              return {
                value: ort.key,
                text: ort.key,
              };
            }),
          ]}
        />
        <MySelect
          className="form-floating col-12 col-sm-7 pb-3"
          required
          id={'schichtE'}
          title={row.columns.array.find(column => column.name === 'schichtE')?.title ?? 'Schicht'}
          value={row instanceof Row ? row.cells['schichtE'].toString() : undefined}
          options={[
            {
              value: 'T',
              text: `Tag | ${vorgabenU.aZ.bT.toString()}-${vorgabenU.aZ.eT.toString()}/${vorgabenU.aZ.eTF.toString()}`,
              selected: true,
            },
            { value: 'N', text: `Nacht | ${vorgabenU.aZ.bN.toString()}-${vorgabenU.aZ.eN.toString()}` },
            { value: 'BN', text: `Nacht (Ber) | ${vorgabenU.aZ.bBN.toString()}-${vorgabenU.aZ.eN.toString()}` },
            { value: 'S', text: `Sonder | ${vorgabenU.aZ.bS.toString()}-${vorgabenU.aZ.eS.toString()}` },
          ]}
        />
        <MyCheckbox
          className="form-check form-switch col-12 col-sm-4 pb-3"
          id={'berechnen'}
          checked={row instanceof Row ? row.cells['berechnen'] : true}
        >
          {row.columns.array.find(column => column.name === 'berechnen')?.title ?? 'Berechnen?'}
        </MyCheckbox>

        <hr />
        <div className="icon-ewt">
          <span className="material-icons-round big-icons">arrow_downward</span>
          <h4 className="text-center mb-1">Wohnung</h4>
          <span className="material-icons-round big-icons">arrow_upward</span>
        </div>
        {createTimeElement(row, 'abWE')}
        {createTimeElement(row, 'anWE')}

        <h4 className="text-center mb-1">Arbeitszeit</h4>
        {createTimeElement(row, 'beginE')}
        {createTimeElement(row, 'endeE')}

        <h4 className="text-center mb-1">1. Tätigkeitsstätte</h4>
        {createTimeElement(row, 'ab1E')}
        {createTimeElement(row, 'an1E')}

        <h4 className="text-center mb-1">Einsatzort</h4>
        {createTimeElement(row, 'anEE')}
        {createTimeElement(row, 'abEE')}
      </MyModalBody>
    </MyFormModal>,
  );

  if (ref.current === null) throw new Error('referenz nicht gesetzt');
  const form = ref.current;

  const getFormValues = (): IDatenEWT => {
    let values: IDatenEWT = {
      _id: rowCells?._id,
      tagE: form.querySelector<HTMLInputElement>('#tagE')?.value ?? '',
      buchungstagE: '',
      eOrtE: form.querySelector<HTMLInputElement>('#eOrtE')?.value ?? '',
      schichtE: form.querySelector<HTMLInputElement>('#schichtE')?.value ?? '',
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

    values.buchungstagE = calculateBuchungstagEwt(values);
    return values;
  };

  const updateBuchungstagAnzeige = (): void => {
    if (!buchungstagHinweisRef.current) return;

    const tag = form.querySelector<HTMLInputElement>('#tagE')?.value ?? '';
    if (!tag) {
      buchungstagHinweisRef.current.classList.add('d-none');
      return;
    }

    const values = getFormValues();
    const istGleich = dayjs(values.buchungstagE).isSame(dayjs(values.tagE), 'day');

    if (istGleich) {
      buchungstagHinweisRef.current.classList.add('d-none');
      return;
    }

    if (buchungstagHinweisTextRef.current) {
      buchungstagHinweisTextRef.current.value = dayjs(values.buchungstagE).format('YYYY-MM-DD');
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

  ['tagE', 'eOrtE', 'schichtE', 'berechnen'].forEach(fieldId => {
    const input = form.querySelector<HTMLInputElement | HTMLSelectElement>(`#${fieldId}`);
    if (!input) return;
    input.addEventListener('change', updateBuchungstagAnzeige);
  });

  updateBuchungstagAnzeige();

  modal.row = row;

  function onSubmit(): (event: Event) => void {
    return (event: Event): void => {
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
      if (currentWindow) {
        const conflictingEntry = getEwtDaten().find(existing => {
          if (values._id && existing._id === values._id) return false;
          const existingWindow = getEwtWindow(existing);
          if (!existingWindow) return false;
          return currentWindow.start.isBefore(existingWindow.end) && existingWindow.start.isBefore(currentWindow.end);
        });

        if (conflictingEntry) {
          const schichtHinweis = ['N', 'BN'].includes(conflictingEntry.schichtE)
            ? ` (${conflictingEntry.schichtE}-Schicht beginnt am Vortag)`
            : '';
          createSnackBar({
            message: `EWT<br/>Zeitüberschneidung mit Tag ${dayjs(conflictingEntry.tagE).format('DD.MM.')}${schichtHinweis}.`,
            status: 'warning',
            timeout: 5000,
            fixed: true,
          });
          return;
        }
      }

      const hasExactDuplicate = table.rows.array.some(existingRow => {
        if (existingRow._state === 'deleted') return false;
        if (row instanceof Row && existingRow === row) return false;

        const existing = existingRow.cells;
        return (
          existing.tagE === values.tagE &&
          existing.buchungstagE === values.buchungstagE &&
          existing.eOrtE === values.eOrtE &&
          existing.schichtE === values.schichtE &&
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
      else row.rows.add(values);

      Modal.getInstance(modal)?.hide();
      persistEwtTableData(table);
    };
  }
}
