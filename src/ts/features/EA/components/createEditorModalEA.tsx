import Modal from 'bootstrap/js/dist/modal';
import { createRef, type ChangeEvent, type SubmitEvent } from 'react';

import type { Column } from '@/infrastructure/table/CustomTable';
import { CustomTable, Row } from '@/infrastructure/table/CustomTable';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { MyFormModal, MyInput, MyModalBody, MySelect, showModal } from '@/components';
import { getEwtDaten } from '../../EWT/utils';
import { default as applySelectOptions } from '../../Neben/utils/applySelectOptions';
import type { CustomHTMLDivElement, IDatenEA, IDatenEWT } from '@/types';
import Storage from '@/infrastructure/storage/Storage';
import { default as checkMaxTag } from '@/infrastructure/validation/checkMaxTag';
import dayjs from '@/infrastructure/date/configDayjs';
import { onEvent } from '@/core';
import { calculateEaDauerFromEwt, persistEaTableData } from '../utils';
import { TAETIGKEIT_VORSCHLAEGE } from '../utils/taetigkeitVorschlaege';

const getColumn = (row: CustomTable<IDatenEA> | Row<IDatenEA>, columnName: string): Column<IDatenEA> => {
  const column = row.columns.array.find(column => column.name === columnName);
  if (!column) throw Error(`Spalte ${columnName} nicht gefunden`);
  return column;
};

const createTextElement = (row: CustomTable<IDatenEA> | Row<IDatenEA>, columnName: string) => {
  const column = getColumn(row, columnName);
  return (
    <MyInput
      divClass="form-floating col-6"
      type="text"
      id={column.name}
      name={column.longTitle}
      value={row instanceof Row ? String(row.cells[column.name] ?? '') : undefined}
      required
    >
      {column.longTitle}
    </MyInput>
  );
};

export default function EditorModalEA(row: CustomTable<IDatenEA> | Row<IDatenEA>, titel: string): void {
  const ref = createRef<HTMLFormElement>();

  const Monat: number = Storage.get<number>('Monat', { check: true }) - 1;
  const Jahr: number = Storage.get<number>('Jahr', { check: true });

  let datum: dayjs.Dayjs;
  if (row instanceof Row) {
    datum = dayjs(row.cells.Tag, 'DD.MM.YYYY');
  } else if (row instanceof CustomTable) {
    datum = dayjs([Jahr, Monat, checkMaxTag(Jahr, Monat)]);
  } else throw new Error('unbekannter Fehler');

  const dataE = getEwtDaten(undefined, undefined, { scope: 'monat', filter: 'starttag', excludeDeleted: true });
  const ewtMap = new Map<string, IDatenEWT>(dataE.filter(e => e._id).map(e => [e._id as string, e]));

  const currentEwtRef = row instanceof Row ? row.cells.EWT : undefined;

  const usedEwtRefs = new Set(
    Storage.get<IDatenEA[]>('dataEA', { default: [] })
      .filter(ea => ea.EWT && ea.EWT !== currentEwtRef)
      .map(ea => ea.EWT as string),
  );

  const buildEwtOptions = (rows: IDatenEWT[]) => [
    { value: '', text: '— keine Zuordnung —', selected: !currentEwtRef },
    ...rows.map(day => {
      const tag = dayjs(day.Tag).format('DD | dd');
      let text = tag;
      if (day.Schicht === 'N') text = `${tag} | Nacht`;
      else if (day.Schicht === 'BN') text = `${tag} | Nacht / Bereitschaft`;
      const isUnsynced = !day._id || day.__localState === 'modified';
      if (isUnsynced) text += ' (wird noch gespeichert)';
      return {
        value: day._id ?? '',
        text,
        selected: currentEwtRef === day._id,
        disabled: isUnsynced || usedEwtRefs.has(day._id ?? ''),
      };
    }),
  ];

  const ewtOptions = buildEwtOptions(dataE);

  const applyEwtSelection = (currentForm: HTMLFormElement, selectedId: string): void => {
    const tagInput = currentForm.querySelector<HTMLInputElement>('#Tag');
    const dauerInput = currentForm.querySelector<HTMLInputElement>('#Dauer');
    if (tagInput) tagInput.disabled = Boolean(selectedId);
    if (dauerInput) dauerInput.disabled = Boolean(selectedId);
    if (!selectedId) return;
    const entry = ewtMap.get(selectedId);
    if (!entry) return;
    if (tagInput) tagInput.value = dayjs(entry.Tag).format('YYYY-MM-DD');
    if (dauerInput) dauerInput.value = calculateEaDauerFromEwt(entry);
  };

  const handleEwtChange = (evt: ChangeEvent<HTMLSelectElement>): void => {
    const select = evt.target as HTMLSelectElement;
    const currentForm = ref.current;
    if (!currentForm) return;
    applyEwtSelection(currentForm, select.value);
  };

  const modal: CustomHTMLDivElement<IDatenEA> = showModal(
    <MyFormModal
      myRef={ref}
      title={titel}
      submitText={row instanceof Row ? 'Speichern' : undefined}
      helpContext={row instanceof Row ? 'modal.eaEintrag.edit' : 'modal.eaEintrag.add'}
      errorMessage={row instanceof Row && row.isError ? (row._errorMessage ?? undefined) : undefined}
      onSubmit={onSubmit()}
    >
      <MyModalBody>
        {dataE.length > 0 && (
          <MySelect
            className="form-floating col-12"
            id="ewtRefSelect"
            title="EWT-Eintrag (optional)"
            options={ewtOptions}
            changeHandler={handleEwtChange}
          />
        )}

        <MyInput
          divClass="form-floating col-6"
          required
          type="date"
          id="Tag"
          name={row.columns.array.find(column => column.name === 'Tag')?.title ?? 'Tag'}
          min={datum.startOf('M').format('YYYY-MM-DD')}
          max={datum.endOf('M').format('YYYY-MM-DD')}
          value={datum.format('YYYY-MM-DD')}
          disabled={Boolean(currentEwtRef)}
        >
          {row.columns.array.find(column => column.name === 'Tag')?.title ?? 'Tag'}
        </MyInput>

        <MyInput
          divClass="form-floating col-6"
          required
          type="time"
          id="Dauer"
          name="Dauer"
          value={row instanceof Row ? row.cells.Dauer : ''}
          disabled={Boolean(currentEwtRef)}
        >
          Dauer
        </MyInput>

        <MyInput
          divClass="form-floating col-6"
          type="text"
          id="Taetigkeit"
          name="Tätigkeit"
          list="taetigkeitVorschlaege"
          value={row instanceof Row ? String(row.cells.Taetigkeit ?? '') : undefined}
          required
        >
          Tätigkeit
        </MyInput>
        <datalist id="taetigkeitVorschlaege">
          {TAETIGKEIT_VORSCHLAEGE.map(vorschlag => (
            <option key={vorschlag} value={vorschlag} />
          ))}
        </datalist>

        {createTextElement(row, 'Entgeltgruppe')}
      </MyModalBody>
    </MyFormModal>,
  );

  if (ref.current === null) throw new Error('referenz nicht gesetzt');
  const form = ref.current;

  modal.row = row;

  const unsubscribeEwtSync = onEvent('data:changed', ({ resource }) => {
    if (resource !== 'EWT' && resource !== 'all') return;
    const select = form.querySelector<HTMLSelectElement>('#ewtRefSelect');
    if (!select) return;
    const freshDataE = getEwtDaten(undefined, undefined, { scope: 'monat', filter: 'starttag', excludeDeleted: true });
    applySelectOptions(select, buildEwtOptions(freshDataE));
    // Der aktuell gewählte EWT-Eintrag kann sich zeitlich geändert haben (z.B. Beginn/Ende bearbeitet,
    // während dieses Modal noch offen ist) — Dauer muss dann neu berechnet werden.
    if (select.value) applyEwtSelection(form, select.value);
  });
  modal.addEventListener('hide.bs.modal', unsubscribeEwtSync, { once: true });

  function onSubmit(): (event: SubmitEvent<HTMLFormElement>) => void {
    return (event: SubmitEvent<HTMLFormElement>): void => {
      if (!form.checkValidity()) return;
      event.preventDefault();

      const row = modal.row;
      if (!row) throw new Error('Row nicht gefunden');
      const table = row instanceof Row ? row.CustomTable : row;

      const selectedEwtRef = form.querySelector<HTMLSelectElement>('#ewtRefSelect')?.value || undefined;

      const values: IDatenEA = {
        _id: row instanceof Row ? row.cells._id : undefined,
        EWT: selectedEwtRef,
        Tag: dayjs(form.querySelector<HTMLInputElement>('#Tag')?.value ?? 0).format('DD.MM.YYYY'),
        Dauer: form.querySelector<HTMLInputElement>('#Dauer')?.value ?? '',
        Taetigkeit: form.querySelector<HTMLInputElement>('#Taetigkeit')?.value ?? '',
        Entgeltgruppe: form.querySelector<HTMLInputElement>('#Entgeltgruppe')?.value ?? '',
      };

      const hasDuplicateDay = table.rows.array.some(existingRow => {
        if (existingRow._state === 'deleted') return false;
        if (row instanceof Row && existingRow === row) return false;
        return existingRow.cells.Tag === values.Tag;
      });

      if (hasDuplicateDay) {
        createSnackBar({
          message: 'Entgeltausgleich<br/>Für diesen Tag existiert bereits ein Eintrag.',
          status: 'warning',
          timeout: 4000,
          fixed: true,
        });
        return;
      }

      if (row instanceof Row) row.val(values);
      else row.rows.add(values);

      Modal.getInstance(modal)?.hide();
      persistEaTableData(table);
    };
  }
}
