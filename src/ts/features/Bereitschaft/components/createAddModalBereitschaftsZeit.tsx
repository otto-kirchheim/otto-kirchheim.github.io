import { createRef, type SubmitEvent, type ReactElement } from 'react';

import { BereitschaftsEinsatzZeiträume } from '../utils/constants';
import { MyCheckbox, MyFormModal, MyModalBody, MySelect, schliesseModal, showModal } from '@/components';
import type { CustomHTMLDivElement, CustomHTMLTableElement, IDatenBZ, IVorgabenU, IVorgabenUvorgabenB } from '@/types';
import { default as Storage } from '@/infrastructure/storage/Storage';
import { default as checkMaxTag } from '@/infrastructure/validation/checkMaxTag';
import dayjs from '@/infrastructure/date/configDayjs';
import {
  applyBereitschaftsVorgabe,
  submitBereitschaftsZeiten,
  updateBereitschaftsDatum,
  toggleBereitschaftsEigeneWerte,
  hideBereitschaftsNachtfelder,
  persistBereitschaftsZeitraumTableData,
  mergeSchichtenOverrides,
  setBereitschaftRuntimeOverrides,
} from '../utils';
import type { BereitschaftRuntimeOverrides } from '../utils/bereitschaftRuntimeOverrides';
import { BereitschaftOverridePanel } from './BereitschaftOverridePanel';

// Kompaktes, einzeiliges Datumsfeld; standardmäßig berechnet (disabled), per „Datum manuell anpassen" editierbar.
const createDateInputElement = (id: string, date: dayjs.Dayjs, min: dayjs.Dayjs, max: dayjs.Dayjs) => (
  <input
    type="date"
    id={id}
    required
    disabled
    className="form-control form-control-sm flex-grow-1"
    style={{ minWidth: 0, maxWidth: '10rem' }}
    min={min.format('YYYY-MM-DD')}
    max={max.format('YYYY-MM-DD')}
    value={date.format('YYYY-MM-DD')}
  />
);

// Abgeleitete Zeit – standardmäßig berechnet (disabled), per „Datum & Zeiten manuell anpassen"
// editierbar (nur die BZ-Grenzen bAT/bET; Nacht/Spät folgen immer der Arbeitszeit bzw. dem
// Override-Panel, da auch die Berechnung die Nacht-Blöcke daraus ableitet). Wert wird von
// applyBereitschaftsVorgabe/updateBereitschaftsDatum gesetzt und von submitBereitschaftsZeiten gelesen.
const createTimeInputElement = (id: string, name: string, required = false) => (
  <input
    type="time"
    id={id}
    name={name}
    aria-label={name}
    required={required}
    disabled
    className="form-control form-control-sm flex-shrink-0"
    style={{ width: '6.5rem' }}
  />
);

const createSonderDateInputElement = (id: string, value: string) => (
  <input
    type="date"
    id={id}
    className="form-control form-control-sm flex-grow-1"
    style={{ minWidth: 0, maxWidth: '10rem' }}
    value={value}
  />
);

// Ein „Zeitpunkt" (Anfang/Ende) als kompakte Zeile: Label · Datum (füllt) · Zeit · optional „berechnet"-Badge.
const punktZeile = (label: string, berechnet: boolean, dateEl: ReactElement, timeEl: ReactElement) => (
  <div className="d-flex align-items-center gap-2 py-1">
    <span className="small fw-medium text-body flex-shrink-0" style={{ width: '3.5rem' }}>
      {label}
    </span>
    {dateEl}
    {timeEl}
    {berechnet ? (
      <span className="badge text-bg-light border berechnet-badge flex-shrink-0" style={{ fontSize: '0.6rem' }}>
        berechnet
      </span>
    ) : null}
  </div>
);

export default function createAddModalBereitschaftsZeit(): void {
  const formRef = createRef<HTMLFormElement>();

  const vorgabenU = Storage.get<Partial<IVorgabenU>>('VorgabenU') ?? { VorgabenB: BereitschaftsEinsatzZeiträume };
  const aZ = (vorgabenU as IVorgabenU).Arbeitszeit;
  const Monat: number = Storage.get<number>('Monat', { check: true }) - 1;
  const Jahr: number = Storage.get<number>('Jahr', { check: true });
  const vorgabenB: { [key: string]: IVorgabenUvorgabenB } = vorgabenU.VorgabenB ?? BereitschaftsEinsatzZeiträume;
  const spaetVerfuegbar: boolean = !!(vorgabenU as IVorgabenU).Arbeitszeit?.spaet?.aktiv;

  let vorgabenBStandardIndex = '2';
  for (const key in vorgabenB)
    if (vorgabenB[key].standard) {
      vorgabenBStandardIndex = key;
      break;
    }
  let auswahl: string = vorgabenBStandardIndex;

  // Interaktiv im Modal gesetzte Arbeitszeit-Overrides (BereitschaftOverridePanel) für diesen Eintrag.
  let runtimeOverrides: BereitschaftRuntimeOverrides | undefined;
  setBereitschaftRuntimeOverrides(undefined);
  const effektiveVorgabe = (): IVorgabenUvorgabenB => ({
    ...vorgabenB[auswahl],
    schichtenOverrides: mergeSchichtenOverrides(vorgabenB[auswahl].schichtenOverrides, runtimeOverrides),
  });

  const vorgabenB_Select = () => {
    const ref = createRef<HTMLSelectElement>();
    const changeHandler = () => {
      if (ref.current === null) throw Error('Referenz fehlt');
      auswahl = ref.current.value;
      applyBereitschaftsVorgabe(modal, effektiveVorgabe(), datum);
    };
    return (
      <MySelect
        myRef={ref}
        className="form-floating col-12 pb-3"
        id="vorgabeB"
        title="Auswahl Bereitschaft"
        value={auswahl}
        options={Object.entries(vorgabenB).map(value => {
          return {
            value: value[0],
            html: false,
            text:
              `${value[1].Name} | ` +
              `${dayjs()
                .isoWeekday(value[1].beginnB.tag === 0 ? 7 : value[1].beginnB.tag)
                .format('ddd')} - ${dayjs()
                .isoWeekday(value[1].endeB.tag === 0 ? 7 : value[1].endeB.tag)
                .format('ddd')} | ` +
              `${
                (value[1].schichten ? value[1].schichten.includes('nacht') : value[1].nacht)
                  ? `${dayjs()
                      .isoWeekday(value[1].beginnN.tag === 0 ? 7 : value[1].beginnN.tag)
                      .format('ddd')} - ${dayjs()
                      .isoWeekday(value[1].endeN.tag === 0 ? 7 : value[1].endeN.tag)
                      .format('ddd')}`
                  : '-----'
              }` +
              `${value[1].schichten?.includes('sonder') ? ` | Sonder ${aZ?.sonder.beginn ?? ''}–${aZ?.sonder.ende ?? ''}` : ''}` +
              (value[1].standard ? ' | Standard' : ''),
          };
        })}
        changeHandler={changeHandler}
      />
    );
  };

  let datum: dayjs.Dayjs = dayjs([Jahr, Monat, checkMaxTag(Jahr, Monat)]).isoWeekday(
    vorgabenB[auswahl].beginnB.tag === 0 ? 7 : vorgabenB[auswahl].beginnB.tag,
  );

  if (datum.isSameOrBefore(dayjs([Jahr, Monat]).startOf('M'))) {
    datum = datum.add(1, 'w');
  } else if (datum.isSameOrAfter(dayjs([Jahr, Monat]).endOf('M'))) {
    datum = datum.subtract(1, 'w');
  }

  const datumInput = () => {
    const ref = createRef<HTMLInputElement>();
    const changeHandler = () => {
      if (ref.current === null) throw Error('Referenz fehlt');
      datum = dayjs(ref.current.value);
      updateBereitschaftsDatum(modal, effektiveVorgabe(), datum);
    };
    return (
      <input
        ref={ref}
        type="date"
        id="bA"
        required
        className="form-control form-control-sm flex-grow-1"
        style={{ minWidth: 0, maxWidth: '10rem' }}
        min={datum.startOf('M').format('YYYY-MM-DD')}
        max={datum.endOf('M').format('YYYY-MM-DD')}
        value={datum.format('YYYY-MM-DD')}
        onChange={changeHandler}
      />
    );
  };

  const modal: CustomHTMLDivElement<IDatenBZ> = showModal(
    <MyFormModal
      myRef={formRef}
      title="Neue Bereitschaft eingeben"
      helpContext="modal.bereitschaft.add"
      onSubmit={onSubmit()}
    >
      <MyModalBody>
        {vorgabenB_Select()}

        <div className="col-12">
          <MyCheckbox
            className="form-check form-switch bereitschaft"
            id="eigen"
            changeHandler={() => {
              toggleBereitschaftsEigeneWerte(modal, effektiveVorgabe(), datum);
            }}
          >
            Datum & Zeiten manuell anpassen
            <br />
            <small>(z.B. bei stundenweiser Übernahme der Bereitschaft)</small>
          </MyCheckbox>
        </div>

        <small className="col-12 text-muted" id="schichtHinweisText" />

        <div className="col-12 border rounded p-3">
          <p className="text-muted small fw-semibold text-uppercase mb-2 ps-1">Bereitschaftszeitraum</p>
          {/* Zeit-Platzhalter werden unmittelbar von applyBereitschaftsVorgabe aus aZ je Wochentag gesetzt. */}
          {punktZeile('Anfang', false, datumInput(), createTimeInputElement('bAT', 'Von', true))}
          {punktZeile(
            'Ende',
            true,
            createDateInputElement(
              'bE',
              datum
                .isoWeekday(vorgabenB[auswahl].endeB.tag === 0 ? 7 : vorgabenB[auswahl].endeB.tag)
                .add(vorgabenB[auswahl].endeB.Nwoche ? 7 : 0, 'd'),
              datum.startOf('M'),
              datum.add(1, 'M').endOf('M'),
            ),
            createTimeInputElement('bET', 'Bis', true),
          )}
        </div>

        {spaetVerfuegbar && (
          <div className="col-12">
            <MyCheckbox
              className="form-check form-switch bereitschaft"
              id="spaet"
              checked={vorgabenB[auswahl].schichten?.includes('spaet') ?? false}
            >
              Spätschicht
            </MyCheckbox>
          </div>
        )}

        {spaetVerfuegbar && (
          <div
            className="col-12 border rounded p-3"
            id="spaetschicht"
            style={{
              display: !(vorgabenB[auswahl].schichten?.includes('spaet') ?? false) ? 'none' : undefined,
            }}
          >
            <p className="text-muted small fw-semibold text-uppercase mb-2 ps-1">Spätschicht</p>
            <div className="d-flex align-items-center gap-2 py-1">
              <span className="small fw-medium text-body flex-shrink-0" style={{ width: '3.5rem' }}>
                Von
              </span>
              {createTimeInputElement('spaetAT', 'Von')}
              <span className="small fw-medium text-body flex-shrink-0 ms-auto pe-2">Bis</span>
              {createTimeInputElement('spaetET', 'Bis')}
            </div>
          </div>
        )}

        {(vorgabenU as IVorgabenU).Arbeitszeit?.sonder?.aktiv && (
          <div className="col-12">
            <MyCheckbox
              className="form-check form-switch bereitschaft"
              id="sonder"
              checked={vorgabenB[auswahl].schichten?.includes('sonder') ?? false}
              changeHandler={() => {
                const sonderChecked = modal.querySelector<HTMLInputElement>('#sonder')?.checked ?? false;
                const sonderContainer = modal.querySelector<HTMLElement>('#sonderschicht');
                if (sonderContainer) sonderContainer.style.display = sonderChecked ? '' : 'none';
              }}
            >
              Sonderschicht
            </MyCheckbox>
          </div>
        )}

        {(vorgabenU as IVorgabenU).Arbeitszeit?.sonder?.aktiv && (
          <div
            className="col-12 border rounded p-3"
            id="sonderschicht"
            style={{ display: (vorgabenB[auswahl].schichten?.includes('sonder') ?? false) ? '' : 'none' }}
          >
            <p className="text-muted small fw-semibold text-uppercase mb-2 ps-1">Sonderschicht Zeitraum</p>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="small fw-medium text-body flex-shrink-0" style={{ width: '3.5rem' }}>
                Von
              </span>
              {createSonderDateInputElement('sonderVon', datum.format('YYYY-MM-DD'))}
              <span className="small fw-medium text-body flex-shrink-0 ms-auto pe-2">Bis</span>
              {createSonderDateInputElement('sonderBis', datum.format('YYYY-MM-DD'))}
            </div>
            <small className="text-muted d-block mt-2">
              Gleiches Datum ist erlaubt und bedeutet einen einzelnen Tag.
            </small>
          </div>
        )}

        <div className="col-12">
          <MyCheckbox
            className="form-check form-switch bereitschaft"
            id="nacht"
            checked={
              vorgabenB[auswahl].schichten ? vorgabenB[auswahl].schichten!.includes('nacht') : vorgabenB[auswahl].nacht
            }
            changeHandler={() => {
              hideBereitschaftsNachtfelder(modal);
            }}
          >
            Nachtschicht
          </MyCheckbox>
        </div>

        <div
          className="col-12 border rounded p-3"
          id="nachtschicht"
          style={{
            display: !(vorgabenB[auswahl].schichten?.includes('nacht') ?? vorgabenB[auswahl].nacht)
              ? 'none'
              : undefined,
          }}
        >
          <p className="text-muted small fw-semibold text-uppercase mb-2 ps-1">Nachtschicht</p>
          {punktZeile(
            'Anfang',
            true,
            createDateInputElement(
              'nA',
              datum
                .isoWeekday(vorgabenB[auswahl].beginnN.tag === 0 ? 7 : vorgabenB[auswahl].beginnN.tag)
                .add(vorgabenB[auswahl].beginnN.Nwoche ? 7 : 0, 'd'),
              datum.subtract(1, 'month').endOf('M'),
              datum.add(1, 'M').endOf('M'),
            ),
            createTimeInputElement('nAT', 'Von'),
          )}
          {punktZeile(
            'Ende',
            true,
            createDateInputElement(
              'nE',
              datum
                .isoWeekday(vorgabenB[auswahl].endeN.tag === 0 ? 7 : vorgabenB[auswahl].endeN.tag)
                .add(vorgabenB[auswahl].endeN.Nwoche ? 7 : 0, 'd'),
              datum.startOf('M'),
              datum.add(1, 'M').endOf('M'),
            ),
            createTimeInputElement('nET', 'Bis'),
          )}
          <small className="text-muted d-block mt-2">
            Die Zeiten folgen der Arbeitszeit Nacht und lassen sich über „Andere Arbeitszeiten hinterlegen" ändern.
          </small>
        </div>

        <BereitschaftOverridePanel
          aZ={aZ}
          onChange={ov => {
            runtimeOverrides = ov;
            setBereitschaftRuntimeOverrides(ov);
            // Abgeleitete Zeiten neu setzen; Datumsfelder bleiben im Handbetrieb unangetastet.
            updateBereitschaftsDatum(modal, effektiveVorgabe(), datum);
          }}
        />
      </MyModalBody>
    </MyFormModal>,
  );

  if (formRef.current === null) throw new Error('referenz nicht gesetzt');
  const form = formRef.current;

  applyBereitschaftsVorgabe(modal, effektiveVorgabe(), datum);

  // Spät-Zeiten bleiben abgeleitet (Override-Panel) → nur Sichtbarkeit des Spät-Blocks steuern.
  const refreshSpaetFelder = (): void => {
    const spaetChecked = modal.querySelector<HTMLInputElement>('#spaet')?.checked ?? false;
    const spaetContainer = modal.querySelector<HTMLElement>('#spaetschicht');
    if (spaetContainer) spaetContainer.style.display = spaetChecked ? '' : 'none';
  };

  modal.querySelector<HTMLInputElement>('#bA')?.addEventListener('change', () => {
    const dateValue = modal.querySelector<HTMLInputElement>('#bA')?.value;
    if (dateValue) datum = dayjs(dateValue);
    refreshSpaetFelder();
  });
  // Manuell geändertes Ende-Datum → bET (BZ-Bis-Zeit) neu aus dem neuen Wochentag ableiten.
  modal.querySelector<HTMLInputElement>('#bE')?.addEventListener('change', () => {
    updateBereitschaftsDatum(modal, effektiveVorgabe(), datum);
  });
  modal.querySelector<HTMLInputElement>('#spaet')?.addEventListener('change', () => {
    // Spätschicht verschiebt die BZ-Von-Zeit (frueh.Ende → spaet.Ende) – Zeiten werden neu abgeleitet.
    updateBereitschaftsDatum(modal, effektiveVorgabe(), datum);
    refreshSpaetFelder();
  });
  modal.querySelector<HTMLSelectElement>('#vorgabeB')?.addEventListener('change', () => {
    refreshSpaetFelder();
  });
  refreshSpaetFelder();

  function onSubmit(): (event: SubmitEvent<HTMLFormElement>) => void {
    return (event: SubmitEvent<HTMLFormElement>): void => {
      if (!(form instanceof HTMLFormElement)) return;
      if (form?.checkValidity && !form.checkValidity()) return;
      event.preventDefault();
      const table = document.querySelector<CustomHTMLTableElement<IDatenBZ>>('#tableBZ');
      if (!table) throw new Error('tableBZ nicht gefunden');
      submitBereitschaftsZeiten(modal, table);
      schliesseModal();
      persistBereitschaftsZeitraumTableData(table.instance);
    };
  }
}
