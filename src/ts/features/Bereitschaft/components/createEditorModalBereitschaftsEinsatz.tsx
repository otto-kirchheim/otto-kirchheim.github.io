import type { Dayjs } from 'dayjs';
import { createRef, type SubmitEvent, Fragment, type ReactNode } from 'react';

import { CustomTable, Row } from '@/infrastructure/table/CustomTable';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { MyFormModal, MyInput, MyModalBody, MySelect, schliesseModal, showModal } from '@/components';
import type { CustomHTMLDivElement, IDatenBE } from '@/types';
import { default as Storage } from '@/infrastructure/storage/Storage';
import { default as checkMaxTag } from '@/infrastructure/validation/checkMaxTag';
import dayjs from '@/infrastructure/date/configDayjs';
import { onEvent } from '@/core';
import {
  classifyBzCoverage,
  isBzUnsynced,
  ensureCompleteBzSynced,
  getBereitschaftsZeitraumDaten,
  hasConflictingLre1,
  hasLre12TooClose,
  hasOverlap,
  persistBereitschaftsEinsatzTableData,
} from '../utils';

const createElements = (row: CustomTable<IDatenBE> | Row<IDatenBE>, datum: Dayjs): ReactNode => {
  return row.columns.array.map(column => {
    switch (column.name) {
      case 'Tag':
        return (
          <MyInput
            divClass="form-floating col-12 col-sm-6"
            type="date"
            id={column.name}
            name={column.title}
            required
            min={datum.startOf('M').format('YYYY-MM-DD')}
            max={datum.endOf('M').format('YYYY-MM-DD')}
            value={datum.format('YYYY-MM-DD')}
          >
            {column.title}
          </MyInput>
        );
      case 'Auftragsnummer':
        return (
          <MyInput
            divClass="form-floating col-12"
            type="text"
            id={column.name}
            name={column.longTitle}
            required
            min={datum.startOf('M').format('YYYY-MM-DD')}
            max={datum.endOf('M').format('YYYY-MM-DD')}
            value={row instanceof Row ? row.cells[column.name] : ''}
          >
            {column.longTitle}
          </MyInput>
        );
      case 'Beginn':
      case 'Ende':
        return (
          <MyInput
            divClass="form-floating col-12 col-sm-6"
            type="time"
            id={column.name}
            name={column.title}
            required
            value={row instanceof Row ? row.cells[column.name] : ''}
          >
            {column.title}
          </MyInput>
        );
      case 'LRE':
        return (
          <Fragment>
            <MySelect
              className="form-floating sp-sm-6"
              id={column.name}
              title={column.title}
              required
              value={row instanceof Row ? row.cells[column.name] : ''}
              options={[
                { text: 'Bitte Einsatz auswählen', disabled: true, selected: true },
                { value: 'LRE 1', text: 'LRE 1' },
                { value: 'LRE 2', text: 'LRE 2' },
                { value: 'LRE 1/2 ohne x', text: 'LRE 1/2 ohne x' },
                { value: 'LRE 3', text: 'LRE 3' },
                { value: 'LRE 3 ohne x', text: 'LRE 3 ohne x' },
              ]}
            />
          </Fragment>
        );
      case 'PrivatKm':
        return (
          <MyInput
            divClass="form-floating col-12 col-sm-6"
            type="number"
            id={column.name}
            name={column.longTitle}
            min={'0'}
            value={row instanceof Row ? row.cells[column.name] : ''}
            popover={{
              title: column.longTitle,
              content:
                'Nur angeben, wenn im Einsatzverlauf mit einem privaten Fahrzeug gefahren wurde. Und kein Dienstwagen zur Verfügung stand.',
              placement: 'top',
              trigger: 'focus',
            }}
          >
            {column.longTitle}
          </MyInput>
        );
      default:
        return;
    }
  });
};

const hasUnsyncedBz = (): boolean =>
  getBereitschaftsZeitraumDaten(undefined, undefined, { excludeDeleted: true }).some(isBzUnsynced);

export default function EditorModalBE(row: CustomTable<IDatenBE> | Row<IDatenBE>, titel: string): void {
  const ref = createRef<HTMLFormElement>();
  const bzSyncHintRef = createRef<HTMLParagraphElement>();

  let datum: dayjs.Dayjs;
  if (row instanceof Row) {
    datum = dayjs(row.cells.Tag, 'DD.MM.YYYY');
  } else if (row instanceof CustomTable) {
    const Monat: number = Storage.get<number>('Monat', { check: true });
    const Jahr: number = Storage.get<number>('Jahr', { check: true });
    datum = dayjs([Jahr, Monat - 1, checkMaxTag(Jahr, Monat - 1)]);
  } else throw new Error('unbekannter Fehler');

  const modal: CustomHTMLDivElement<IDatenBE> = showModal(
    <MyFormModal
      myRef={ref}
      title={titel}
      submitText={row instanceof Row ? 'Speichern' : undefined}
      helpContext={
        row instanceof Row ? 'modal.bereitschaftEinsatzEintrag.edit' : 'modal.bereitschaftEinsatzEintrag.add'
      }
      errorMessage={row instanceof Row && row.isError ? (row._errorMessage ?? undefined) : undefined}
      onSubmit={onSubmit()}
    >
      <MyModalBody>
        <p className="text-bg-warning p-2 rounded small">
          Hinweis: Vor dem Speichern muss ein passender Bereitschaftszeitraum vorhanden sein.
        </p>
        <p
          ref={bzSyncHintRef}
          className="text-bg-warning p-2 rounded small"
          style={{ display: hasUnsyncedBz() ? '' : 'none' }}
        >
          Achtung: Es gibt einen gerade erst angelegten, noch nicht gespeicherten Bereitschaftszeitraum. Falls dieser
          zum Einsatz passt, bitte kurz warten, bis er synchronisiert ist.
        </p>
        {createElements(row, datum)}
      </MyModalBody>
    </MyFormModal>,
  );

  if (ref.current === null) throw new Error('referenz nicht gesetzt');
  const form = ref.current;

  modal.row = row;

  const unsubscribeBzSyncHint = onEvent('data:changed', ({ resource }) => {
    if (resource !== 'BZ' && resource !== 'all') return;
    const el = bzSyncHintRef.current;
    if (!el) return;
    el.style.display = hasUnsyncedBz() ? '' : 'none';
  });
  modal.addEventListener('hide.bs.modal', unsubscribeBzSyncHint, { once: true });

  function onSubmit(): (event: SubmitEvent<HTMLFormElement>) => void {
    return async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
      if (!form.checkValidity()) return;
      event.preventDefault();

      const row = modal.row;
      if (!row) throw new Error('Row nicht gefunden');
      const table: CustomTable<IDatenBE> = row instanceof Row ? row.CustomTable : row;
      const currentBe = row instanceof Row ? row.cells : undefined;

      const values: IDatenBE = {
        _id: row instanceof Row ? row.cells._id : undefined,
        Bereitschaftszeitraum: row instanceof Row ? row.cells.Bereitschaftszeitraum : undefined,
        Tag: dayjs(form.querySelector<HTMLInputElement>('#Tag')?.value).format('DD.MM.YYYY') ?? '',
        Auftragsnummer: form.querySelector<HTMLInputElement>('#Auftragsnummer')?.value ?? '',
        Beginn: form.querySelector<HTMLInputElement>('#Beginn')?.value ?? '',
        Ende: form.querySelector<HTMLInputElement>('#Ende')?.value ?? '',
        LRE: (form.querySelector<HTMLSelectElement>('#LRE')?.value as IDatenBE['LRE']) ?? '',
        PrivatKm: Number(form.querySelector<HTMLInputElement>('#PrivatKm')?.value ?? 0),
      };

      const einsatzDate = dayjs(values.Tag, 'DD.MM.YYYY').format('YYYY-MM-DD');
      const einsatzStart = dayjs(`${einsatzDate}T${values.Beginn}`);
      const einsatzEndRaw = dayjs(`${einsatzDate}T${values.Ende}`);
      const einsatzEnd = einsatzEndRaw.isAfter(einsatzStart) ? einsatzEndRaw : einsatzEndRaw.add(1, 'day');

      let coverage = classifyBzCoverage(
        getBereitschaftsZeitraumDaten(undefined, undefined, { excludeDeleted: true }),
        einsatzStart,
        einsatzEnd,
      );
      coverage = await ensureCompleteBzSynced(coverage, einsatzStart, einsatzEnd);

      if (coverage.kind !== 'complete') {
        const message =
          coverage.kind === 'gap'
            ? 'Bereitschaft<br/>Der Einsatz liegt in einer Lücke zwischen zwei Bereitschaftszeiträumen.<br/>Bitte Zeiträume anpassen.'
            : 'Bereitschaft<br/>Kein passender Bereitschaftszeitraum für den geänderten Einsatz gefunden.<br/>Bitte Zeitraum anpassen oder neu anlegen.';
        createSnackBar({ message, status: 'warning', timeout: 4500, fixed: true });
        return;
      }

      const { startBz, endBz } = coverage;
      const bzIdsForEdit = [startBz._id, startBz !== endBz ? endBz._id : undefined].filter(Boolean) as string[];

      if (!bzIdsForEdit.length || (startBz !== endBz && bzIdsForEdit.length < 2)) {
        createSnackBar({
          message:
            'Bereitschaft<br/>Der passende Bereitschaftszeitraum ist noch nicht gespeichert.<br/>Bitte zuerst Zeiträume speichern.',
          status: 'warning',
          timeout: 4500,
          fixed: true,
        });
        return;
      }

      values.Bereitschaftszeitraum = bzIdsForEdit;

      if (hasOverlap(einsatzStart, einsatzEnd, currentBe)) {
        createSnackBar({
          message: 'Bereitschaft<br/>Bereitschaftseinsätze dürfen sich nicht überschneiden.',
          status: 'warning',
          timeout: 4000,
          fixed: true,
        });
        return;
      }

      if (values.LRE === 'LRE 1' && hasConflictingLre1(einsatzStart, einsatzDate, currentBe)) {
        createSnackBar({
          message: 'Bereitschaft<br/>Im gewählten Bereitschaftszeitraum existiert bereits ein LRE 1.',
          status: 'warning',
          timeout: 4000,
          fixed: true,
        });
        return;
      }

      if ((values.LRE === 'LRE 1' || values.LRE === 'LRE 2') && hasLre12TooClose(einsatzStart, currentBe)) {
        createSnackBar({
          message:
            'Bereitschaft<br/>Weniger als 10 Minuten nach einem LRE 1/2-Einsatz: Bitte "LRE 1/2 ohne x" verwenden.',
          status: 'warning',
          timeout: 4000,
          fixed: true,
        });
        return;
      }

      if (row instanceof Row) row.val(values);
      else row.rows.add(values);

      schliesseModal();
      persistBereitschaftsEinsatzTableData(table);
    };
  }
}
