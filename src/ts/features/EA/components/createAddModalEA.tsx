import { createRef, type ChangeEvent, type SubmitEvent } from 'react';

import type { CustomTable } from '@/shared/ui/custom-table/CustomTable';
import { MyFormModal, MyInput, MyModalBody, MySelect, beiModalSchliessen, showModal } from '@/components';
import type { IDatenEA, IDatenEWT, IVorgabenU } from '@/types';
import { createSnackBar } from '@/shared/ui/snackbar/CustomSnackbar';
import Storage from '@/shared/lib/storage/Storage';
import dayjs from '@/shared/lib/date/configDayjs';
import { onEvent } from '@/core';
import { getEwtDaten } from '../../EWT/utils';
import { default as applySelectOptions } from '../../../shared/ui/form/applySelectOptions';
import { addEaTag, calculateEaDauerFromEwt } from '../utils';
import { TAETIGKEIT_VORSCHLAEGE } from '../utils/taetigkeitVorschlaege';

/**
 * Schlägt die Entgeltgruppe für höherwertige Arbeit vor: die Entgeltgruppe des Nutzers minus 1.
 *
 * @param vorgabenU - Persönliche Vorgaben mit `Pers.Entgeltgruppe`.
 * @returns Vorschlag als String; leer, wenn die Entgeltgruppe fehlt oder nicht rein numerisch ist.
 */
export function suggestNextEntgeltgruppe(vorgabenU: IVorgabenU): string {
  const basis = vorgabenU.Pers.Entgeltgruppe;
  if (!basis || !/^\d+$/.test(basis)) return '';
  return String(Number(basis) - 1);
}

/**
 * Chronologisch erster EWT-Eintrag ab (exklusive) `after`, der weder unsynchronisiert noch bereits
 * mit einer EA-Zeile verknüpft ist. `after` verhindert beim Weiterschalten Rücksprünge: sonst würde
 * ein früherer, weiterhin offener Tag den Fortschritt immer wieder dorthin zurückreißen.
 *
 * @param dataE - EWT-Einträge des Monats.
 * @param usedEwtRefs - Ids der bereits mit einer EA-Zeile verknüpften EWT-Einträge.
 * @param after - Nur Einträge nach diesem Tag; ohne Angabe zählt der gesamte Monat.
 * @returns Der nächste freie EWT-Eintrag oder undefined.
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

/**
 * Erster Kalendertag im [start, ende]-Bereich, für den noch kein EA-Eintrag existiert.
 *
 * @param existingTags - Bereits belegte Tage als `DD.MM.YYYY`.
 * @param start - Erster zu prüfender Tag.
 * @param ende - Letzter zu prüfender Tag (inklusiv).
 * @returns Freier Tag als `YYYY-MM-DD` (Format des Date-Inputs) oder undefined, wenn alle belegt sind.
 */
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

/**
 * Öffnet das Modal zum Hinzufügen eines EA-Eintrags im aktiven Monat. Optional wird ein EWT-Eintrag
 * verknüpft (sperrt Tag/Dauer und übernimmt sie aus dem EWT); nach dem Speichern springt das Modal
 * zum nächsten offenen Tag, damit mehrere Einträge ohne Neustart erfasst werden können.
 *
 * @param tableEA - EA-Tabelle, in die der Eintrag eingefügt wird.
 * @throws {Error} Wenn die Formular-Referenz nach dem Rendern nicht gesetzt ist.
 */
export default function createAddModalEA(tableEA: CustomTable<IDatenEA>): void {
  const ref = createRef<HTMLFormElement>();

  const vorgabenU: IVorgabenU = Storage.get('VorgabenU', { check: true });

  const Jahr: number = Storage.get<number>('Jahr', { check: true });
  const Monat: number = Storage.get<number>('Monat', { check: true });
  const datum = dayjs([Jahr, Monat - 1, 1]);
  const maxDate = datum.endOf('month').format('YYYY-MM-DD');

  /**
   * Ids der EWT-Einträge, die bereits von einer nicht gelöschten EA-Zeile referenziert werden.
   * Liest aus der Live-Tabelle statt aus dem Storage-Snapshot, damit der Weiterschalten-Check nicht
   * von der Persistierung abhängt.
   *
   * @returns Menge der verknüpften EWT-Ids.
   */
  const getUsedEwtRefs = (): Set<string> =>
    new Set(
      tableEA.rows.array.filter(row => row._state !== 'deleted' && row.cells.EWT).map(row => row.cells.EWT as string),
    );

  /**
   * Baut die Optionen des EWT-Selects; unsynchronisierte und bereits verknüpfte Einträge sind gesperrt.
   *
   * @param rows - Anzubietende EWT-Einträge.
   * @param usedEwtRefs - Ids bereits verknüpfter EWT-Einträge.
   * @param selectedId - Vorausgewählte EWT-Id; ohne Angabe ist "keine Zuordnung" gewählt.
   * @returns Optionsliste für `MySelect` bzw. `applySelectOptions`.
   */
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

  /**
   * Sperrt Tag und Dauer, solange ein EWT-Eintrag gewählt ist, und füllt sie daraus; ohne Auswahl
   * werden beide Felder wieder freigegeben.
   *
   * @param dataE - EWT-Einträge, in denen `selectedId` gesucht wird.
   * @param selectedId - Gewählte EWT-Id oder leerer String für "keine Zuordnung".
   */
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

  /**
   * Übernimmt bei Wechsel der EWT-Auswahl Tag und Dauer aus dem gewählten Eintrag.
   *
   * @param evt - Change-Event des EWT-Selects.
   */
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
            id="ewtRefSelect"
            title="EWT-Eintrag (optional)"
            options={buildEwtOptions(initialDataE, getUsedEwtRefs(), initialNextEwt?._id)}
            changeHandler={handleEwtChange}
          />
        )}

        <MyInput
          divClass="sp-12"
          required
          type="date"
          id="Tag"
          name="Tag"
          min={datum.format('YYYY-MM-DD')}
          max={maxDate}
        >
          Tag
        </MyInput>

        <MyInput divClass="sp-12" required type="time" id="Dauer" name="Dauer">
          Dauer
        </MyInput>

        <MyInput divClass="sp-12" required type="text" id="Taetigkeit" name="Taetigkeit" list="taetigkeitVorschlaege">
          Tätigkeit
        </MyInput>
        <datalist id="taetigkeitVorschlaege">
          {TAETIGKEIT_VORSCHLAEGE.map(vorschlag => (
            <option key={vorschlag} value={vorschlag} />
          ))}
        </datalist>

        <MyInput
          divClass="sp-12"
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
  beiModalSchliessen(unsubscribeEwtSync);

  /**
   * Wählt nach dem Speichern den nächsten noch nicht verknüpften EWT-Eintrag und füllt Tag/Dauer neu.
   * Gibt es keinen, wird der nächste Kalendertag ohne EA-Eintrag vorgeschlagen (oder direkt mit einem
   * dort liegenden freien EWT-Eintrag verknüpft); sind alle Tage belegt, erscheint ein Hinweis.
   */
  function advanceToNextEwt(): void {
    const select = form.querySelector<HTMLSelectElement>('#ewtRefSelect');
    const tagInput = form.querySelector<HTMLInputElement>('#Tag');
    // Das Tag-Feld enthält hier noch den Wert des gerade gespeicherten Eintrags; ist es leer, dient
    // der Vortag des Monatsbeginns als Anker vor allen Tagen.
    const lastTag = tagInput?.value ? dayjs(tagInput.value) : datum.subtract(1, 'day');
    const freshDataE = getEwtDaten(undefined, undefined, { scope: 'monat', filter: 'starttag', excludeDeleted: true });
    const usedEwtRefs = getUsedEwtRefs();
    const next = findNextAvailableEwt(freshDataE, usedEwtRefs, lastTag);

    if (select) {
      applySelectOptions(select, buildEwtOptions(freshDataE, usedEwtRefs, next?._id));
      // applySelectOptions behält die vorherige Auswahl, solange sie noch existiert (jetzt nur
      // disabled); ohne Override bliebe der gerade verbrauchte EWT-Eintrag gewählt.
      select.value = next?._id ?? '';
    }

    if (next) {
      applyEwtSelection(freshDataE, next._id as string);
      return;
    }

    // Kein weiterer freier EWT-Eintrag: nächsten Kalendertag ohne EA-Eintrag vorschlagen, ebenfalls
    // erst ab lastTag (kein Rücksprung auf frühere offene Tage).
    const existingTags = new Set(tableEA.rows.array.filter(row => row._state !== 'deleted').map(row => row.cells.Tag));
    const nextFreeDay = findNextFreeDay(existingTags, lastTag.add(1, 'day'), datum.endOf('month'));

    // Liegt auf dem freien Tag ein noch nicht verknüpfter, synchronisierter EWT-Eintrag, direkt
    // verknüpfen statt Tag/Dauer manuell zu verlangen.
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

  /**
   * Erzeugt den Submit-Handler: legt bei gültigem Formular den EA-Eintrag an und schaltet weiter.
   *
   * @returns Submit-Handler des Formulars.
   */
  function onSubmit(): (event: SubmitEvent<HTMLFormElement>) => void {
    return (event: SubmitEvent<HTMLFormElement>): void => {
      if (!form.checkValidity()) return;
      event.preventDefault();
      const added = addEaTag(modal, tableEA);
      if (added) advanceToNextEwt();
    };
  }
}
