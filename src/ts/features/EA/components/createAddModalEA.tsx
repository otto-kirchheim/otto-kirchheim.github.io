import { createRef, type ChangeEvent, type SubmitEvent } from 'react';

import type { CustomTable } from '@/infrastructure/table/CustomTable';
import { MyFormModal, MyInput, MyModalBody, MySelect, showModal } from '@/components';
import type { IDatenEA, IDatenEWT, IVorgabenU } from '@/types';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import Storage from '@/infrastructure/storage/Storage';
import dayjs from '@/infrastructure/date/configDayjs';
import { onEvent } from '@/core';
import { getEwtDaten } from '../../EWT/utils';
import { default as applySelectOptions } from '../../Neben/utils/applySelectOptions';
import { addEaTag, calculateEaDauerFromEwt } from '../utils';
import { TAETIGKEIT_VORSCHLAEGE } from '../utils/taetigkeitVorschlaege';

export function suggestNextEntgeltgruppe(vorgabenU: IVorgabenU): string {
  const basis = vorgabenU.Pers.Entgeltgruppe;
  if (!basis || !/^\d+$/.test(basis)) return '';
  return String(Number(basis) - 1);
}

/**
 * Chronologisch erster EWT-Eintrag ab (exklusive) `after`, der weder unsynchronisiert noch bereits
 * mit einer EA-Zeile verknüpft ist. Ohne `after` zählt der gesamte Monat (initialer Modal-Zustand).
 * `after` sorgt dafür, dass beim Weiterschalten nur vorwaerts gesprungen wird -- sonst würde ein
 * frueherer, weiterhin offener Tag (z.B. Tag 2 ohne EWT-Bezug) den Fortschritt immer wieder dorthin
 * zurückreißen, statt beim zuletzt bearbeiteten Tag fortzufahren.
 */
function findNextAvailableEwt(
  dataE: IDatenEWT[],
  usedEwtRefs: Set<string>,
  after?: ReturnType<typeof dayjs>,
): IDatenEWT | undefined {
  return [...dataE]
    .sort((a, b) => dayjs(a.Tag).valueOf() - dayjs(b.Tag).valueOf())
    .find(
      day =>
        day._id &&
        day.__localState !== 'modified' &&
        !usedEwtRefs.has(day._id) &&
        (!after || dayjs(day.Tag).isAfter(after, 'day')),
    );
}

/** Erster Kalendertag im [start, ende]-Bereich, für den noch kein EA-Eintrag existiert. */
function findNextFreeDay(
  existingTags: Set<string>,
  start: ReturnType<typeof dayjs>,
  ende: ReturnType<typeof dayjs>,
): string | undefined {
  let cursor = start;
  while (!cursor.isAfter(ende, 'day')) {
    if (!existingTags.has(cursor.format('DD.MM.YYYY'))) return cursor.format('YYYY-MM-DD');
    cursor = cursor.add(1, 'day');
  }
  return undefined;
}

export default function createAddModalEA(tableEA: CustomTable<IDatenEA>): void {
  const ref = createRef<HTMLFormElement>();

  const vorgabenU: IVorgabenU = Storage.get('VorgabenU', { check: true });

  const Jahr: number = Storage.get<number>('Jahr', { check: true });
  const Monat: number = Storage.get<number>('Monat', { check: true });
  const datum = dayjs([Jahr, Monat - 1, 1]);
  const maxDate = datum.endOf('month').format('YYYY-MM-DD');

  // Liest direkt aus der Live-Tabelle statt aus dem Storage-Snapshot -- vermeidet jede
  // Abhaengigkeit von persistTableData/Storage-Serialisierung fuer den Weiterschalten-Check.
  const getUsedEwtRefs = (): Set<string> =>
    new Set(
      tableEA.rows.array.filter(row => row._state !== 'deleted' && row.cells.EWT).map(row => row.cells.EWT as string),
    );

  const buildEwtOptions = (rows: IDatenEWT[], usedEwtRefs: Set<string>, selectedId?: string) => [
    { value: '', text: '— keine Zuordnung —', selected: !selectedId },
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
        selected: Boolean(day._id) && day._id === selectedId,
        disabled: isUnsynced || (usedEwtRefs.has(day._id ?? '') && day._id !== selectedId),
      };
    }),
  ];

  const applyEwtSelection = (dataE: IDatenEWT[], selectedId: string): void => {
    const currentForm = ref.current;
    if (!currentForm) return;
    const tagInput = currentForm.querySelector<HTMLInputElement>('#Tag');
    const dauerInput = currentForm.querySelector<HTMLInputElement>('#Dauer');
    if (tagInput) tagInput.disabled = Boolean(selectedId);
    if (dauerInput) dauerInput.disabled = Boolean(selectedId);
    if (!selectedId) return;
    if (!dauerInput) return;
    const entry = dataE.find(day => day._id === selectedId);
    if (!entry) return;
    if (tagInput) tagInput.value = dayjs(entry.Tag).format('YYYY-MM-DD');
    dauerInput.value = calculateEaDauerFromEwt(entry);
  };

  const handleEwtChange = (evt: ChangeEvent<HTMLSelectElement>): void => {
    const select = evt.target as HTMLSelectElement;
    const dataE = getEwtDaten(undefined, undefined, { scope: 'monat', filter: 'starttag', excludeDeleted: true });
    applyEwtSelection(dataE, select.value);
  };

  const initialDataE = getEwtDaten(undefined, undefined, { scope: 'monat', filter: 'starttag', excludeDeleted: true });
  const initialNextEwt = findNextAvailableEwt(initialDataE, getUsedEwtRefs());

  const modal = showModal<IDatenEA>(
    <MyFormModal
      myRef={ref}
      title="Entgeltausgleich hinzufügen"
      helpContext="modal.eaEintrag.add"
      onSubmit={onSubmit()}
    >
      <MyModalBody>
        {initialDataE.length > 0 && (
          <MySelect
            className="form-floating col-12"
            id="ewtRefSelect"
            title="EWT-Eintrag (optional)"
            options={buildEwtOptions(initialDataE, getUsedEwtRefs(), initialNextEwt?._id)}
            changeHandler={handleEwtChange}
          />
        )}

        <MyInput
          divClass="form-floating col-12"
          required
          type="date"
          id="Tag"
          name="Tag"
          min={datum.format('YYYY-MM-DD')}
          max={maxDate}
        >
          Tag
        </MyInput>

        <MyInput divClass="form-floating col-12" required type="time" id="Dauer" name="Dauer">
          Dauer
        </MyInput>

        <MyInput
          divClass="form-floating col-12"
          required
          type="text"
          id="Taetigkeit"
          name="Taetigkeit"
          list="taetigkeitVorschlaege"
        >
          Tätigkeit
        </MyInput>
        <datalist id="taetigkeitVorschlaege">
          {TAETIGKEIT_VORSCHLAEGE.map(vorschlag => (
            <option key={vorschlag} value={vorschlag} />
          ))}
        </datalist>

        <MyInput
          divClass="form-floating col-12"
          required
          type="text"
          id="Entgeltgruppe"
          name="Entgeltgruppe"
          value={suggestNextEntgeltgruppe(vorgabenU)}
        >
          Entgeltgruppe
        </MyInput>
      </MyModalBody>
    </MyFormModal>,
  );

  if (ref.current === null) throw new Error('referenz nicht gesetzt');
  const form = ref.current;

  if (initialNextEwt) applyEwtSelection(initialDataE, initialNextEwt._id as string);

  const unsubscribeEwtSync = onEvent('data:changed', ({ resource }) => {
    if (resource !== 'EWT' && resource !== 'all') return;
    const select = form.querySelector<HTMLSelectElement>('#ewtRefSelect');
    if (!select) return;
    const freshDataE = getEwtDaten(undefined, undefined, { scope: 'monat', filter: 'starttag', excludeDeleted: true });
    applySelectOptions(select, buildEwtOptions(freshDataE, getUsedEwtRefs(), select.value));
    if (select.value) applyEwtSelection(freshDataE, select.value);
  });
  modal.addEventListener('hide.bs.modal', unsubscribeEwtSync, { once: true });

  /** Wählt nach dem Speichern den nächsten noch nicht verknüpften EWT-Eintrag und füllt Tag/Dauer neu — ermöglicht durchgängiges Erfassen ohne Modal-Neustart. */
  function advanceToNextEwt(): void {
    const select = form.querySelector<HTMLSelectElement>('#ewtRefSelect');
    const tagInput = form.querySelector<HTMLInputElement>('#Tag');
    // Tag-Feld enthaelt an dieser Stelle noch den Wert des gerade abgeschickten Eintrags (day3) --
    // vor der ersten Verwendung dient der Vortag des Monatsbeginns als "vor allem" liegender Anker.
    const lastTag = tagInput?.value ? dayjs(tagInput.value) : datum.subtract(1, 'day');
    const freshDataE = getEwtDaten(undefined, undefined, { scope: 'monat', filter: 'starttag', excludeDeleted: true });
    const usedEwtRefs = getUsedEwtRefs();
    const next = findNextAvailableEwt(freshDataE, usedEwtRefs, lastTag);

    if (select) {
      applySelectOptions(select, buildEwtOptions(freshDataE, usedEwtRefs, next?._id));
      // applySelectOptions haelt die vorherige Auswahl, solange sie unter den neuen Optionen noch
      // existiert (jetzt nur disabled) -- ohne diesen Override bliebe die Auswahl auf dem gerade
      // verbrauchten EWT-Eintrag stehen und nur das Tag-Feld wuerde sichtbar weiterspringen.
      select.value = next?._id ?? '';
    }

    if (next) {
      applyEwtSelection(freshDataE, next._id as string);
      return;
    }

    // Kein weiterer freier EWT-Eintrag: naechsten Kalendertag ohne EA-Eintrag vorschlagen -- ebenfalls
    // erst ab lastTag, sonst wuerde auch hier ein frueherer offener Tag den Fortschritt zurueckreissen.
    const existingTags = new Set(tableEA.rows.array.filter(row => row._state !== 'deleted').map(row => row.cells.Tag));
    const nextFreeDay = findNextFreeDay(existingTags, lastTag.add(1, 'day'), datum.endOf('month'));

    // Entspricht der freie Tag zufaellig einem noch nicht verknuepften EWT-Eintrag (z.B. gerade erst
    // angelegt, noch unsynchronisiert), direkt verknuepfen statt Tag/Dauer manuell zu verlangen.
    const dayMatch = nextFreeDay
      ? freshDataE.find(day => dayjs(day.Tag).format('YYYY-MM-DD') === nextFreeDay)
      : undefined;
    const matchAvailable =
      dayMatch && dayMatch._id && dayMatch.__localState !== 'modified' && !usedEwtRefs.has(dayMatch._id);

    if (matchAvailable && dayMatch) {
      if (select) select.value = dayMatch._id as string;
      applyEwtSelection(freshDataE, dayMatch._id as string);
      return;
    }

    const tag = form.querySelector<HTMLInputElement>('#Tag');
    const dauer = form.querySelector<HTMLInputElement>('#Dauer');
    if (tag) {
      tag.value = nextFreeDay ?? '';
      tag.disabled = false;
    }
    if (dauer) {
      dauer.value = '';
      dauer.disabled = false;
    }
    if (!nextFreeDay) {
      createSnackBar({
        message: 'Entgeltausgleich<br/>Für alle Tage dieses Monats existiert bereits ein Eintrag.',
        status: 'info',
        timeout: 3500,
        fixed: true,
      });
    }
  }

  function onSubmit(): (event: SubmitEvent<HTMLFormElement>) => void {
    return (event: SubmitEvent<HTMLFormElement>): void => {
      if (!form.checkValidity()) return;
      event.preventDefault();
      const added = addEaTag(modal, tableEA);
      if (added) advanceToNextEwt();
    };
  }
}
