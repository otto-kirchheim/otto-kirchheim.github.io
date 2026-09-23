import { DBTag, DBTooltip } from '@db-ux/react-core-components';
import { createRef, type CSSProperties, type SubmitEvent, type ReactElement } from 'react';

import { BereitschaftsEinsatzZeiträume } from '../model/constants';
import { DbFeld } from '@/shared/ui/form/DbFeld';
import MyCheckbox from '@/shared/ui/form/MyCheckbox';
import MyFormModal from '@/shared/ui/modal/MyFormModal';
import MyModalBody from '@/shared/ui/modal/MyModalBody';
import MySelect from '@/shared/ui/form/MySelect';
import showModal, { schliesseModal } from '@/shared/ui/modal/showModal';
import type { CustomHTMLDivElement, CustomHTMLTableElement, IDatenBZ, IVorgabenU, IVorgabenUvorgabenB } from '@/types';
import { default as Storage } from '@/shared/lib/storage/Storage';
import { default as checkMaxTag } from '@/shared/lib/validation/checkMaxTag';
import dayjs from '@/shared/lib/date/configDayjs';
import {
  applyBereitschaftsVorgabe,
  submitBereitschaftsZeiten,
  updateBereitschaftsDatum,
  toggleBereitschaftsEigeneWerte,
  hideBereitschaftsNachtfelder,
  persistBereitschaftsZeitraumTableData,
  mergeSchichtenOverrides,
  setBereitschaftRuntimeOverrides,
} from '../model';
import type { BereitschaftRuntimeOverrides } from '../model/bereitschaftRuntimeOverrides';
import { BereitschaftOverridePanel } from './BereitschaftOverridePanel';

const HINWEIS_MANUELL = 'Wird aus der Vorgabe berechnet. Zum Ändern „Datum & Zeiten manuell anpassen" aktivieren.';
/**
 * Tooltip-Text für Zeitfelder, die aus der Arbeitszeit einer Schicht folgen.
 *
 * @param schicht - Schichtname ("Spät" oder "Nacht").
 * @returns Hinweistext.
 */
const hinweisArbeitszeit = (schicht: string): string =>
  `Folgt der Arbeitszeit ${schicht}. Zum Ändern „Andere Arbeitszeiten hinterlegen" nutzen.`;

/**
 * Hängt einen Tooltip an ein (meist deaktiviertes) Feld. Deaktivierte Felder bekommen keine Hover-Events
 * (`pointer-events: none` in styles.scss), deshalb sitzt der Tooltip an einer Hülle. Der „manuell"-Hinweis
 * (Klasse `berechnet-hinweis`) verschwindet mit dem „berechnet"-Badge, sobald `toggleBereitschaftsEigeneWerte`
 * die Felder freischaltet; der Arbeitszeit-Hinweis bleibt, da diese Zeiten nie direkt editierbar sind.
 *
 * @param feld - Das umhüllte Feld.
 * @param text - Tooltip-Text.
 * @param manuell - `true` = Hinweis gehört zum „manuell anpassen"-Schalter (wird mit ihm ausgeblendet).
 * @param className - Zusätzliche CSS-Klassen der Hülle.
 * @param style - Optionaler Inline-Style der Hülle.
 * @returns Die Hülle mit Feld und Tooltip.
 */
const mitHinweis = (feld: ReactElement, text: string, manuell: boolean, className: string, style?: CSSProperties) => (
  // Hülle ist per `tabIndex` fokussierbar, damit der Hinweis auch per Tastatur erreichbar ist (die Lint-Regel
  // prüft nur den Tag-Namen, deshalb hier bewusst ausgenommen).
  <div className={`feld-hinweis ${className}`} style={style} tabIndex={0}>
    {feld}
    {/* eslint-disable-next-line db-ux/tooltip-requires-interactive-parent */}
    <DBTooltip placement="top" className={manuell ? 'berechnet-hinweis' : undefined}>
      {text}
    </DBTooltip>
  </div>
);

/**
 * Kompaktes, einzeiliges Datumsfeld; standardmäßig berechnet (disabled), per „Datum & Zeiten manuell anpassen" editierbar.
 *
 * @param id - Feld-Id (bE, nA oder nE).
 * @param date - Vorbelegter Wert.
 * @param min - Frühestes zulässiges Datum.
 * @param max - Spätestes zulässiges Datum.
 * @returns Das Feld samt Hinweis-Tooltip.
 */
const createDateInputElement = (id: string, date: dayjs.Dayjs, min: dayjs.Dayjs, max: dayjs.Dayjs) =>
  mitHinweis(
    <DbFeld
      type="date"
      id={id}
      beschriftung="Datum"
      dicht
      required
      disabled
      min={min.format('YYYY-MM-DD')}
      max={max.format('YYYY-MM-DD')}
      defaultValue={date.format('YYYY-MM-DD')}
    />,
    HINWEIS_MANUELL,
    true,
    'flex-grow-1',
    { minWidth: 0, maxWidth: '10rem' },
  );

/**
 * Abgeleitetes Zeitfeld, standardmäßig berechnet (disabled). Per „Datum & Zeiten manuell anpassen"
 * editierbar sind nur die BZ-Grenzen bAT/bET; Nacht/Spät folgen immer der Arbeitszeit bzw. dem Override-Panel,
 * da auch die Berechnung die Nacht-Blöcke daraus ableitet. Der Wert wird von `applyBereitschaftsVorgabe`/
 * `updateBereitschaftsDatum` gesetzt und von `submitBereitschaftsZeiten` gelesen.
 *
 * @param id - Feld-Id.
 * @param name - Feldname, zugleich Beschriftung ("Von"/"Bis").
 * @param required - Pflichtfeld.
 * @param schicht - Gesetzt, wenn die Zeit nie direkt editierbar ist, sondern der Arbeitszeit dieser Schicht folgt.
 * @returns Das Feld samt Hinweis-Tooltip.
 */
const createTimeInputElement = (id: string, name: string, required = false, schicht?: string) =>
  mitHinweis(
    <DbFeld
      type="time"
      id={id}
      name={name}
      beschriftung={name}
      dicht
      required={required}
      disabled
      huelleStyle={{ width: '6.5rem' }}
    />,
    schicht ? hinweisArbeitszeit(schicht) : HINWEIS_MANUELL,
    !schicht,
    'flex-shrink-0',
  );

/**
 * Editierbares Datumsfeld für den Sonderschicht-Zeitraum.
 *
 * @param id - Feld-Id (sonderVon oder sonderBis).
 * @param value - Vorbelegter Wert ("YYYY-MM-DD").
 * @returns Das Datumsfeld.
 */
const createSonderDateInputElement = (id: string, value: string) => (
  <DbFeld
    type="date"
    id={id}
    beschriftung="Datum"
    dicht
    className="flex-grow-1"
    huelleStyle={{ minWidth: 0, maxWidth: '10rem' }}
    defaultValue={value}
  />
);

/**
 * Ein „Zeitpunkt" (Anfang/Ende) als kompakte Zeile: Label · Datum (füllt) · Zeit · optional „berechnet"-Badge.
 *
 * @param label - Zeilenbeschriftung ("Anfang"/"Ende").
 * @param berechnet - `true` zeigt das „berechnet"-Badge.
 * @param dateEl - Datumsfeld.
 * @param timeEl - Zeitfeld.
 * @returns Die Zeile.
 */
const punktZeile = (label: string, berechnet: boolean, dateEl: ReactElement, timeEl: ReactElement) => (
  <div className="d-flex align-items-center gap-2 py-1">
    <span className="small fw-medium text-body flex-shrink-0" style={{ width: '3.5rem' }}>
      {label}
    </span>
    {dateEl}
    {timeEl}
    {berechnet ? (
      <DBTag
        className="border berechnet-badge flex-shrink-0"
        semantic="neutral"
        emphasis="strong"
        style={{ fontSize: '0.6rem' }}
      >
        berechnet
      </DBTag>
    ) : null}
  </div>
);

/**
 * Öffnet das Modal „Neue Bereitschaft eingeben": Vorgabe wählen, Zeiten aus der Vorgabe ableiten lassen
 * (oder manuell anpassen), Spät-/Sonder-/Nachtschicht und Arbeitszeit-Overrides festlegen. Beim Absenden
 * legt `submitBereitschaftsZeiten` die Zeiträume an.
 *
 * @throws {Error} Wenn die Formular-Referenz nach dem Rendern fehlt.
 */
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
  /**
   * Gewählte Vorgabe samt Schicht-Overrides (Vorgabe + interaktiv im Panel gesetzte).
   *
   * @returns Vorgabe mit zusammengeführten `schichtenOverrides`.
   */
  const effektiveVorgabe = (): IVorgabenUvorgabenB => ({
    ...vorgabenB[auswahl],
    schichtenOverrides: mergeSchichtenOverrides(vorgabenB[auswahl].schichtenOverrides, runtimeOverrides),
  });

  /**
   * Auswahlfeld für die Bereitschafts-Vorgabe; ein Wechsel leitet die Felder aus der neuen Vorgabe neu ab.
   *
   * @returns Das Auswahlfeld.
   */
  const vorgabenB_Select = () => {
    const ref = createRef<HTMLSelectElement>();
    /**
     * Übernimmt die gewählte Vorgabe und wendet sie auf die Felder an.
     *
     * @throws {Error} Wenn die Select-Referenz fehlt.
     */
    const changeHandler = () => {
      if (ref.current === null) throw Error('Referenz fehlt');
      auswahl = ref.current.value;
      applyBereitschaftsVorgabe(modal, effektiveVorgabe(), datum);
    };
    return (
      <MySelect
        myRef={ref}
        className="pb-3"
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

  /**
   * Startdatum-Feld der Bereitschaft; eine Änderung leitet die abhängigen Zeiten und Felder neu ab.
   *
   * @returns Das Datumsfeld (`#bA`).
   */
  const datumInput = () => {
    const ref = createRef<HTMLInputElement>();
    /**
     * Übernimmt das geänderte Startdatum und leitet die Zeiten neu ab.
     *
     * @throws {Error} Wenn die Feld-Referenz fehlt.
     */
    const changeHandler = () => {
      if (ref.current === null) throw Error('Referenz fehlt');
      datum = dayjs(ref.current.value);
      updateBereitschaftsDatum(modal, effektiveVorgabe(), datum);
    };
    return (
      <DbFeld
        feldRef={ref}
        type="date"
        id="bA"
        beschriftung="Datum"
        dicht
        required
        className="flex-grow-1"
        huelleStyle={{ minWidth: 0, maxWidth: '10rem' }}
        min={datum.startOf('M').format('YYYY-MM-DD')}
        max={datum.endOf('M').format('YYYY-MM-DD')}
        defaultValue={datum.format('YYYY-MM-DD')}
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

        <div>
          <MyCheckbox
            className="bereitschaft"
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

        <small className="text-muted" id="schichtHinweisText" />

        <div className="border p-3">
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
          <div>
            <MyCheckbox
              className="bereitschaft"
              id="spaet"
              defaultChecked={vorgabenB[auswahl].schichten?.includes('spaet') ?? false}
            >
              Spätschicht
            </MyCheckbox>
          </div>
        )}

        {spaetVerfuegbar && (
          <div
            className="border p-3"
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
              {createTimeInputElement('spaetAT', 'Von', false, 'Spät')}
              <span className="small fw-medium text-body flex-shrink-0 ms-auto pe-2">Bis</span>
              {createTimeInputElement('spaetET', 'Bis', false, 'Spät')}
            </div>
          </div>
        )}

        {(vorgabenU as IVorgabenU).Arbeitszeit?.sonder?.aktiv && (
          <div>
            <MyCheckbox
              className="bereitschaft"
              id="sonder"
              defaultChecked={vorgabenB[auswahl].schichten?.includes('sonder') ?? false}
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
            className="border p-3"
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

        <div>
          <MyCheckbox
            className="bereitschaft"
            id="nacht"
            defaultChecked={
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
          className="border p-3"
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
            createTimeInputElement('nAT', 'Von', false, 'Nacht'),
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
            createTimeInputElement('nET', 'Bis', false, 'Nacht'),
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

  /** Spät-Zeiten bleiben abgeleitet (Override-Panel); steuert nur die Sichtbarkeit des Spät-Blocks. */
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

  /**
   * Erzeugt den Submit-Handler des Formulars: prüft die Validität, legt die Zeiträume an, schließt das
   * Modal und speichert die BZ-Tabelle. Wirft `submitBereitschaftsZeiten`, bleibt das Modal offen.
   *
   * @returns Asynchroner Submit-Handler.
   */
  function onSubmit(): (event: SubmitEvent<HTMLFormElement>) => Promise<void> {
    return async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
      if (!(form instanceof HTMLFormElement)) return;
      if (form?.checkValidity && !form.checkValidity()) return;
      event.preventDefault();
      const table = document.querySelector<CustomHTMLTableElement<IDatenBZ>>('#tableBZ');
      if (!table) throw new Error('tableBZ nicht gefunden');
      // `submitBereitschaftsZeiten` kann werfen (fehlende Inputs/Jahreswechsel-Inkonsistenz); das await
      // verhindert, dass sich das Modal dann trotzdem schließt.
      await submitBereitschaftsZeiten(modal, table);
      schliesseModal();
      persistBereitschaftsZeitraumTableData(table.instance);
    };
  }
}
