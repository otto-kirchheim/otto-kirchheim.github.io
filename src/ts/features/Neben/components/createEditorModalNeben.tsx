import { createRef, type ChangeEvent, type SubmitEvent } from 'react';

import type { Column } from '@/infrastructure/table/CustomTable';
import { CustomTable, Row } from '@/infrastructure/table/CustomTable';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { MyFormModal, MyInput, MyModalBody, MySelect, schliesseModal, showModal } from '@/components';
import { getEwtDaten } from '../../EWT/utils';
import type { CustomHTMLDivElement, IDatenEWT, IDatenN } from '@/types';
import Storage from '@/infrastructure/storage/Storage';
import { default as checkMaxTag } from '@/infrastructure/validation/checkMaxTag';
import dayjs from '@/infrastructure/date/configDayjs';
import { onEvent } from '@/core';
import {
  applySelectOptions,
  formatNebengeldZulagen,
  getConfiguredNebenZulagen,
  normalizeNebengeldZulagen,
  persistNebengeldTableData,
  readNebengeldZulagenFromForm,
  validateNebengeldZulagen,
} from '../utils';

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
      divClass="form-floating col-6"
      type={column.type ?? 'time'}
      id={column.name}
      name={column.longTitle}
      value={row instanceof Row ? String(row.cells[column.name] ?? '') : ''}
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
      divClass="form-floating col-6"
      type={column.type ?? 'text'}
      id={column.name}
      name={column.longTitle}
      value={row instanceof Row ? String(row.cells[column.name] ?? '') : undefined}
      minLength={9}
      maxLength={9}
      required
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
    datum = dayjs(row.cells.Tag, 'DD.MM.YYYY');
  } else if (row instanceof CustomTable) {
    datum = dayjs([Jahr, Monat, checkMaxTag(Jahr, Monat)]);
  } else throw new Error('unbekannter Fehler');

  const dataE = getEwtDaten(undefined, undefined, { scope: 'monat', filter: 'starttag', excludeDeleted: true });
  const ewtMap = new Map<string, IDatenEWT>(dataE.filter(e => e._id).map(e => [e._id as string, e]));
  const existingZulagen = row instanceof Row ? normalizeNebengeldZulagen(row.cells) : [];
  const configuredZulagen = getConfiguredNebenZulagen(existingZulagen.map(zulage => zulage.Typ));

  const currentEwtRef = row instanceof Row ? row.cells.EWT : undefined;

  const usedEwtRefs = new Set(
    Storage.get<IDatenN[]>('dataN', { default: [] })
      .filter(n => n.EWT && n.EWT !== currentEwtRef)
      .map(n => n.EWT as string),
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

  const handleEwtChange = (evt: ChangeEvent<HTMLSelectElement>): void => {
    const select = evt.target as HTMLSelectElement;
    const selectedId = select.value;
    const currentForm = ref.current;
    if (!currentForm) return;
    const tagInput = currentForm.querySelector<HTMLInputElement>('#Tag');
    if (tagInput) tagInput.disabled = Boolean(selectedId);
    if (!selectedId) return;
    const entry = ewtMap.get(selectedId);
    if (!entry) return;
    const beginInput = currentForm.querySelector<HTMLInputElement>('#Beginn');
    const endeInput = currentForm.querySelector<HTMLInputElement>('#Ende');
    if (tagInput) tagInput.value = dayjs(entry.Tag).format('YYYY-MM-DD');
    if (beginInput) beginInput.value = entry.beginE as string;
    if (endeInput) endeInput.value = entry.endeE as string;
  };

  const modal: CustomHTMLDivElement<IDatenN> = showModal(
    <MyFormModal
      myRef={ref}
      title={titel}
      submitText={row instanceof Row ? 'Speichern' : undefined}
      helpContext={row instanceof Row ? 'modal.nebenEintrag.edit' : 'modal.nebenEintrag.add'}
      errorMessage={row instanceof Row && row.isError ? (row._errorMessage ?? undefined) : undefined}
      onSubmit={onSubmit()}
    >
      <MyModalBody>
        {dataE.length > 0 && (
          <MySelect
            className="form-floating"
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
        >
          {row.columns.array.find(column => column.name === 'Tag')?.title ?? 'Tag'}
        </MyInput>

        {createTextElement(row, 'Auftragsnummer')}

        {['Beginn', 'Ende'].map(value => createTimeElement(row, value, { required: true }))}

        <div className="border rounded p-2">
          <p className="text-muted small fw-semibold text-uppercase mb-2 ps-1">Zulagen</p>
          <div className="raster abstand-2">
            {configuredZulagen.map(zulage => {
              const currentValue = existingZulagen.find(item => item.Typ === zulage.code)?.Wert ?? 0;
              return (
                <MyInput
                  key={zulage.code}
                  divClass="form-floating col-6"
                  type="number"
                  id={`zulage-${zulage.code}`}
                  name={`${zulage.code} ${zulage.label}`}
                  value={currentValue}
                  min={'0'}
                  max={zulage.entryRule.maxEntriesPerDay ? String(zulage.entryRule.maxEntriesPerDay) : '600'}
                  required={false}
                  step={'1'}
                  dataZulageInputCode={zulage.code}
                >
                  {`${zulage.code} ${zulage.shortLabel}`}
                </MyInput>
              );
            })}
          </div>
        </div>
      </MyModalBody>
    </MyFormModal>,
  );

  if (ref.current === null) throw new Error('referenz nicht gesetzt');
  const form = ref.current;

  const initialEwtRef = form.querySelector<HTMLSelectElement>('#ewtRefSelect')?.value;
  const tagInput = form.querySelector<HTMLInputElement>('#Tag');
  if (tagInput) tagInput.disabled = Boolean(initialEwtRef);

  modal.row = row;

  const unsubscribeEwtSync = onEvent('data:changed', ({ resource }) => {
    if (resource !== 'EWT' && resource !== 'all') return;
    const select = form.querySelector<HTMLSelectElement>('#ewtRefSelect');
    if (!select) return;
    const freshDataE = getEwtDaten(undefined, undefined, { scope: 'monat', filter: 'starttag', excludeDeleted: true });
    applySelectOptions(select, buildEwtOptions(freshDataE));
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
      const Zulagen = readNebengeldZulagenFromForm(form);
      const validationErrors = validateNebengeldZulagen(Zulagen);
      if (validationErrors.length > 0) {
        createSnackBar({
          message: validationErrors.join('<br/>'),
          status: 'warning',
          timeout: 5000,
          fixed: true,
        });
        return;
      }

      const values: IDatenN = {
        _id: row instanceof Row ? row.cells._id : undefined,
        EWT: selectedEwtRef,
        Tag: dayjs(form.querySelector<HTMLInputElement>('#Tag')?.value ?? 0).format('DD.MM.YYYY'),
        Beginn: form.querySelector<HTMLInputElement>('#Beginn')?.value ?? '',
        Ende: form.querySelector<HTMLInputElement>('#Ende')?.value ?? '',
        Auftragsnummer: form.querySelector<HTMLInputElement>('#Auftragsnummer')?.value ?? '',
        Zulagen,
        zulagenAnzeigeN: formatNebengeldZulagen(Zulagen),
      };

      const hasDuplicateDay = table.rows.array.some(existingRow => {
        if (existingRow._state === 'deleted') return false;
        if (row instanceof Row && existingRow === row) return false;
        return existingRow.cells.Tag === values.Tag;
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

      schliesseModal();
      persistNebengeldTableData(table);
    };
  }
}
