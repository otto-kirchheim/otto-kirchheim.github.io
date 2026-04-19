import Modal from 'bootstrap/js/dist/modal';
import { createRef } from 'preact';
import { MyCheckbox, MyFormModal, MyInput, MyModalBody, MySelect, showModal } from '../../../components';
import type { CustomHTMLDivElement, CustomHTMLTableElement, IDatenBE, IDatenBZ } from '../../../interfaces';
import { default as Storage } from '../../../infrastructure/storage/Storage';
import { default as checkMaxTag } from '../../../infrastructure/validation/checkMaxTag';
import dayjs from '../../../infrastructure/date/configDayjs';
import { submitBereitschaftsEinsatz } from '../utils';

export default function createAddModalBereitschaftsEinsatz(): void {
  const formRef = createRef<HTMLFormElement>();

  const Jahr: number = Storage.get<number>('Jahr', { check: true });
  const Monat: number = Storage.get<number>('Monat', { check: true }) - 1;
  const datum = dayjs([Jahr, Monat, checkMaxTag(Jahr, Monat)]);

  const tableBE = document.querySelector<CustomHTMLTableElement<IDatenBE>>('#tableBE');
  if (!tableBE?.instance) throw new Error('Tabelle nicht gefunden');
  const columns = tableBE.instance.columns.array;
  const tableBZ = document.querySelector<CustomHTMLTableElement<IDatenBZ>>('#tableBZ');
  if (!tableBZ?.instance) throw new Error('tableBZ nicht gefunden');

  const modal: CustomHTMLDivElement<IDatenBE> = showModal(
    <MyFormModal myRef={formRef} title="Neuen Bereitschaftseinsatz eingeben" onSubmit={onSubmit()}>
      <MyModalBody>
        <p className="text-bg-warning p-2 rounded small">
          Hinweis: Vor dem Speichern muss ein passender Bereitschaftszeitraum vorhanden sein. <br /> Oder wähle die
          Option: "zusätzliche Bereitschaftszeit Eingeben".
        </p>
        <MyInput
          divClass="form-floating col-12 col-sm-6 pb-3"
          required
          type={columns.find(col => col.name === 'tagBE')?.type || 'Date'}
          id="Datum"
          name={columns.find(col => col.name === 'tagBE')?.longTitle || 'Datum'}
          min={datum.startOf('M').format('YYYY-MM-DD')}
          max={datum.endOf('M').format('YYYY-MM-DD')}
          value={datum.format('YYYY-MM-DD')}
        >
          Datum
        </MyInput>
        <MyInput
          divClass="form-floating col-12 pb-3"
          required
          type={columns.find(col => col.name === 'auftragsnummerBE')?.type || 'text'}
          id="SAPNR"
          name={columns.find(col => col.name === 'auftragsnummerBE')?.longTitle || 'SAP-Nr / Einsatzbeschreibung'}
        >
          SAP-Nr / Einsatzbeschreibung
        </MyInput>
        <MyInput divClass="form-floating col-12 col-sm-6 pb-3" required type="time" id="ZeitVon" name="Von">
          Von
        </MyInput>
        <MyInput divClass="form-floating col-12 col-sm-6 pb-3" required type="time" id="ZeitBis" name="Bis">
          Bis
        </MyInput>
        <MySelect
          className="form-floating col-12 col-sm-6 pb-3"
          required
          id="LRE"
          title={columns.find(col => col.name === 'lreBE')?.longTitle || 'LRE'}
          options={[
            { text: 'Bitte Einsatz auswählen', disabled: true, selected: true },
            { value: 'LRE 1', text: 'LRE 1' },
            { value: 'LRE 2', text: 'LRE 2' },
            { value: 'LRE 1/2 ohne x', text: 'LRE 1/2 ohne x' },
            { value: 'LRE 3', text: 'LRE 3' },
            { value: 'LRE 3 ohne x', text: 'LRE 3 ohne x' },
          ]}
        />
        <MyInput
          divClass="form-floating col-12 col-sm-6 pb-3"
          type={columns.find(col => col.name === 'privatkmBE')?.type || 'number'}
          id="privatkm"
          name={columns.find(col => col.name === 'privatkmBE')?.longTitle || 'Km Privatfahrzeug'}
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
        <div className="col-12">
          <MyCheckbox className="form-check form-switch bereitschaft" id="berZeit">
            zusätzliche Bereitschaftszeit Eingeben?
            <br />
            <small>(z.B. LRE3 Außerhalb der Bereitschaft.)</small>
          </MyCheckbox>
        </div>
      </MyModalBody>
    </MyFormModal>,
  );

  if (formRef.current === null) throw new Error('referenz nicht gesetzt');
  const form = formRef.current;

  function onSubmit(): (event: Event) => void {
    return (event: Event): void => {
      if (!(form instanceof HTMLFormElement)) return;
      if (form?.checkValidity && !form.checkValidity()) return;
      event.preventDefault();
      const success = submitBereitschaftsEinsatz(modal, tableBE!, tableBZ!);

      if (success) Modal.getInstance(modal)?.hide();
    };
  }
}
