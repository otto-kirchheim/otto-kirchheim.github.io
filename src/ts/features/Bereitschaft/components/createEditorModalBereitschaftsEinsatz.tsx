import type { Dayjs } from 'dayjs';
import { createRef, type SubmitEvent, Fragment, type ReactNode } from 'react';

import { LreType } from '@otto-kirchheim/nebengeld-shared';
import { CustomTable, Row } from '@/shared/ui/custom-table/CustomTable';
import { createSnackBar } from '@/shared/ui/snackbar/CustomSnackbar';
import {
  MyFormModal,
  MyInput,
  MyModalBody,
  MySelect,
  beiModalSchliessen,
  schliesseModal,
  showModal,
} from '@/components';
import type { CustomHTMLDivElement, IDatenBE } from '@/types';
import { default as Storage } from '@/shared/lib/storage/Storage';
import { default as checkMaxTag } from '@/shared/lib/validation/checkMaxTag';
import dayjs from '@/shared/lib/date/configDayjs';
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

/**
 * Baut die Formularfelder des Einsatz-Modals aus den Tabellenspalten.
 *
 * @param row - Zeile (Bearbeiten, Felder vorbelegt) oder Tabelle (Anlegen, Felder leer).
 * @param datum - Vorbelegung des Tag-Felds; bestimmt dessen Monatsgrenzen (`min`/`max`).
 * @returns Ein Eingabefeld je bekannter Spalte (Tag, Auftragsnummer, Beginn/Ende, LRE, PrivatKm).
 */
const createElements = (row: CustomTable<IDatenBE> | Row<IDatenBE>, datum: Dayjs): ReactNode => {
  return row.columns.array.map(column => {
    switch (column.name) {
      case 'Tag':
        return (
          <MyInput
            key={column.name}
            divClass="sp-12 sp-sm-6"
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
            key={column.name}
            divClass="sp-12"
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
            key={column.name}
            divClass="sp-12 sp-sm-6"
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
          <Fragment key={column.name}>
            <MySelect
              className="sp-sm-6"
              id={column.name}
              title={column.title}
              required
              value={row instanceof Row ? row.cells[column.name] : ''}
              options={[
                { text: 'Bitte Einsatz auswählen', disabled: true, selected: true },
                ...Object.values(LreType).map(lre => ({ value: lre, text: lre })),
              ]}
            />
          </Fragment>
        );
      case 'PrivatKm':
        return (
          <MyInput
            key={column.name}
            divClass="sp-12 sp-sm-6"
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

/**
 * Prüft, ob es einen noch nicht synchronisierten Bereitschaftszeitraum gibt.
 *
 * @returns `true`, wenn ein nicht gelöschter Bereitschaftszeitraum noch nicht auf dem Server ist.
 */
const hasUnsyncedBz = (): boolean =>
  getBereitschaftsZeitraumDaten(undefined, undefined, { excludeDeleted: true }).some(isBzUnsynced);

/**
 * Öffnet das Modal zum Bearbeiten eines Bereitschaftseinsatzes bzw. zum Anlegen (bei Tabelle). Beim Speichern braucht der Einsatz einen
 * passenden, gespeicherten Bereitschaftszeitraum (dessen IDs werden eingetragen); außerdem: keine Überschneidung, höchstens ein LRE 1 je
 * Bereitschaftstag und 10 Minuten Abstand nach LRE 1/2. Verstöße zeigen eine Warn-Snackbar und lassen das Modal offen.
 *
 * @param row - Zu bearbeitende Zeile oder Tabelle (= neuen Einsatz anlegen).
 * @param titel - Modal-Titel.
 * @throws {Error} Bei unbekanntem `row`-Typ oder fehlender Formular-Referenz.
 */
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
        <p className="text-bg-warning p-2 small">
          Hinweis: Vor dem Speichern muss ein passender Bereitschaftszeitraum vorhanden sein.
        </p>
        <p ref={bzSyncHintRef} className="text-bg-warning p-2 small" style={{ display: hasUnsyncedBz() ? '' : 'none' }}>
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
  beiModalSchliessen(unsubscribeBzSyncHint);

  /**
   * Baut den Submit-Handler des Formulars.
   *
   * @returns Async-Handler: validiert, schreibt den Einsatz in Zeile bzw. Tabelle, schließt das Modal und speichert.
   */
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

      if (values.LRE === LreType.LRE_1 && hasConflictingLre1(einsatzStart, einsatzDate, currentBe)) {
        createSnackBar({
          message: 'Bereitschaft<br/>Im gewählten Bereitschaftszeitraum existiert bereits ein LRE 1.',
          status: 'warning',
          timeout: 4000,
          fixed: true,
        });
        return;
      }

      if ((values.LRE === LreType.LRE_1 || values.LRE === LreType.LRE_2) && hasLre12TooClose(einsatzStart, currentBe)) {
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
