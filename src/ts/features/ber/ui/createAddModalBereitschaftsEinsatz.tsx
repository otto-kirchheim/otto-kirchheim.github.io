import { createRef, type SubmitEvent } from 'react';

import { LreType } from '@otto-kirchheim/nebengeld-shared';
import MyCheckbox from '@/shared/ui/form/MyCheckbox';
import MyFormModal from '@/shared/ui/modal/MyFormModal';
import MyInput from '@/shared/ui/form/MyInput';
import MyModalBody from '@/shared/ui/modal/MyModalBody';
import MySelect from '@/shared/ui/form/MySelect';
import showModal, { beiModalSchliessen, schliesseModal } from '@/shared/ui/modal/showModal';
import type { CustomHTMLDivElement, CustomHTMLTableElement, IDatenBE, IDatenBZ } from '@/types';
import { default as Storage } from '@/shared/lib/storage/Storage';
import { default as checkMaxTag } from '@/shared/lib/validation/checkMaxTag';
import dayjs from '@/shared/lib/date/configDayjs';
import { onEvent } from '@/shared/lib/events/appEvents';
import { getBereitschaftsZeitraumDaten, isBzUnsynced, submitBereitschaftsEinsatz } from '../model';

/**
 * Prüft, ob es einen noch nicht synchronisierten Bereitschaftszeitraum gibt (dann fehlt dem Einsatz evtl. dessen Server-ID).
 *
 * @returns `true`, wenn ein nicht gelöschter Bereitschaftszeitraum noch nicht auf dem Server ist.
 */
const hasUnsyncedBz = (): boolean =>
  getBereitschaftsZeitraumDaten(undefined, undefined, { excludeDeleted: true }).some(isBzUnsynced);

/**
 * Öffnet das Modal zum Anlegen eines Bereitschaftseinsatzes. Das Datum ist auf den gewählten Monat begrenzt und mit dem heutigen Tag
 * (sonst dem 1.) vorbelegt. Ein Hinweis warnt vor noch nicht synchronisierten Zeiträumen und folgt `data:changed` live.
 *
 * @throws {Error} Wenn `#tableBE`/`#tableBZ` nicht instanziiert sind oder die Formular-Referenz fehlt.
 */
export default function createAddModalBereitschaftsEinsatz(): void {
  const formRef = createRef<HTMLFormElement>();
  const bzSyncHintRef = createRef<HTMLParagraphElement>();

  const Jahr: number = Storage.get<number>('Jahr', { check: true });
  const Monat: number = Storage.get<number>('Monat', { check: true }) - 1;
  const datum = dayjs([Jahr, Monat, checkMaxTag(Jahr, Monat)]);

  const tableBE = document.querySelector<CustomHTMLTableElement<IDatenBE>>('#tableBE');
  if (!tableBE?.instance) throw new Error('Tabelle nicht gefunden');
  const columns = tableBE.instance.columns.array;
  const tableBZ = document.querySelector<CustomHTMLTableElement<IDatenBZ>>('#tableBZ');
  if (!tableBZ?.instance) throw new Error('tableBZ nicht gefunden');

  const modal: CustomHTMLDivElement<IDatenBE> = showModal(
    <MyFormModal
      myRef={formRef}
      title="Neuen Bereitschaftseinsatz eingeben"
      helpContext="modal.bereitschaftEinsatz.add"
      onSubmit={onSubmit()}
    >
      <MyModalBody>
        <p className="text-bg-warning p-2 small">
          Hinweis: Vor dem Speichern muss ein passender Bereitschaftszeitraum vorhanden sein. <br /> Oder wähle die
          Option: "Bereitschaftszeitraum für diesen Einsatz anlegen?".
        </p>
        <p ref={bzSyncHintRef} className="text-bg-warning p-2 small" style={{ display: hasUnsyncedBz() ? '' : 'none' }}>
          Achtung: Es gibt einen gerade erst angelegten, noch nicht gespeicherten Bereitschaftszeitraum. Falls dieser
          zum Einsatz passt, bitte kurz warten, bis er synchronisiert ist.
        </p>
        <MyInput
          divClass="sp-12 sp-sm-6"
          required
          type={columns.find(col => col.name === 'Tag')?.type || 'Date'}
          id="Datum"
          name={columns.find(col => col.name === 'Tag')?.longTitle || 'Datum'}
          min={datum.startOf('M').format('YYYY-MM-DD')}
          max={datum.endOf('M').format('YYYY-MM-DD')}
          value={datum.format('YYYY-MM-DD')}
        >
          Datum
        </MyInput>
        <MyInput
          divClass="sp-12"
          required
          type={columns.find(col => col.name === 'Auftragsnummer')?.type || 'text'}
          id="SAPNR"
          name={columns.find(col => col.name === 'Auftragsnummer')?.longTitle || 'SAP-Nr / Einsatzbeschreibung'}
        >
          SAP-Nr / Einsatzbeschreibung
        </MyInput>
        <MyInput divClass="sp-12 sp-sm-6" required type="time" id="ZeitVon" name="Von">
          Von
        </MyInput>
        <MyInput divClass="sp-12 sp-sm-6" required type="time" id="ZeitBis" name="Bis">
          Bis
        </MyInput>
        <MySelect
          className="sp-sm-6"
          required
          id="LRE"
          title={columns.find(col => col.name === 'LRE')?.longTitle || 'LRE'}
          options={[
            { text: 'Bitte Einsatz auswählen', disabled: true, selected: true },
            ...Object.values(LreType).map(lre => ({ value: lre, text: lre })),
          ]}
        />
        <MyInput
          divClass="sp-12 sp-sm-6 pb-3"
          type={columns.find(col => col.name === 'PrivatKm')?.type || 'number'}
          id="privatkm"
          name={columns.find(col => col.name === 'PrivatKm')?.longTitle || 'Km Privatfahrzeug'}
          min={'0'}
          popover={{
            title: 'Kilometer Privatfahrzeug',
            content:
              'Nur angeben, wenn im Einsatzverlauf mit einem privaten Fahrzeug gefahren wurde. Und kein Dienstwagen zur Verfügung stand.',
            placement: 'top',
            trigger: 'focus',
          }}
        >
          Km Privatfahrzeug
        </MyInput>
        <div>
          <MyCheckbox className="bereitschaft" id="berZeit">
            Bereitschaftszeitraum für diesen Einsatz anlegen?
            <br />
            <small>(z.B. LRE3 außerhalb der Bereitschaft oder Einsatz über Bereitschaftszeitraum-Grenzen hinaus)</small>
          </MyCheckbox>
        </div>
      </MyModalBody>
    </MyFormModal>,
  );

  if (formRef.current === null) throw new Error('referenz nicht gesetzt');
  const form = formRef.current;

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
   * @returns Async-Handler: prüft die Browser-Validierung und speichert per `submitBereitschaftsEinsatz`; das Modal schließt nur bei Erfolg.
   */
  function onSubmit(): (event: SubmitEvent<HTMLFormElement>) => void {
    return async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
      if (!(form instanceof HTMLFormElement)) return;
      if (form?.checkValidity && !form.checkValidity()) return;
      event.preventDefault();
      const success = await submitBereitschaftsEinsatz(modal, tableBE!, tableBZ!);

      if (success) schliesseModal();
    };
  }
}
