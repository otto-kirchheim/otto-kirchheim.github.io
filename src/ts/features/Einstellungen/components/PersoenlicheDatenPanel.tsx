import { DBButton, DBInput, DBSelect, DBStack } from '@db-ux/react-core-components';
import type { ComponentProps } from 'react';

import { STANDARD_UNGUELTIG_MELDUNG } from '@/components/dbFeldHelfer';
import { useEmailStatus } from '../utils/emailStatusStore';
import { TB_VALUES } from '@otto-kirchheim/nebengeld-shared';

/**
 * Phase L3: "Persönliche Daten"-Accordion-Panel (ehemals `index.html`, `#collapseOne`-Inhalt)
 * als React-Komponente. Rein praesentational -- alle Feld-IDs 1:1 uebernommen, denn
 * `generateEingabeMaskeEinstellungen.ts`/`saveEinstellungen.ts` lesen/schreiben jedes Feld
 * ausschliesslich per `document.querySelector('#<Feldname>')` (Feld-Id === `IVorgabenUPers`-Key)
 * -- unveraendert gueltig, unabhaengig davon, ob React oder statisches HTML das Element erzeugt
 * hat. Keine dieser Dateien musste fuer den Umbau angefasst werden.
 */

const TAETIGKEIT_VORSCHLAEGE = ['Arbeiter', 'Facharbeiter', 'Signalmechaniker', 'Signalmechaniker RBEG', 'Meister'];

const BUNDESLAENDER = [
  ['BW', 'Baden-Württemberg'],
  ['BY', 'Bayern'],
  ['BE', 'Berlin'],
  ['BB', 'Brandenburg'],
  ['HB', 'Bremen'],
  ['HH', 'Hamburg'],
  ['HE', 'Hessen'],
  ['MV', 'Mecklenburg-Vorpommern'],
  ['NI', 'Niedersachsen'],
  ['NW', 'Nordrhein-Westfalen'],
  ['RP', 'Rheinland-Pfalz'],
  ['SL', 'Saarland'],
  ['SN', 'Sachsen'],
  ['ST', 'Sachsen-Anhalt'],
  ['SH', 'Schleswig-Holstein'],
  ['TH', 'Thüringen'],
] as const;

type FeldProps = { id: string; label: string; icon: string } & Partial<
  Omit<ComponentProps<typeof DBInput>, 'id' | 'label' | 'icon'>
>;

/** Gemeinsame Huelle der Stammdaten-Felder: schwebendes Label, Icon, Standard-Fehlermeldung. */
function Feld({ id, label, icon, ...rest }: FeldProps) {
  return (
    <DBInput
      id={id}
      label={label}
      showLabel
      variant="floating"
      icon={icon}
      type="text"
      invalidMessage={STANDARD_UNGUELTIG_MELDUNG}
      {...rest}
    />
  );
}

/** Auswahlfeld analog `Feld`; die Optionen kommen als Kinder. */
function Auswahl({
  id,
  label,
  icon,
  children,
  ...rest
}: { id: string; label: string; icon: string } & Partial<
  Omit<ComponentProps<typeof DBSelect>, 'id' | 'label' | 'icon'>
>) {
  return (
    // Die Optionen kommen als Kinder der Aufrufstelle; das sieht die statische Regel nicht.
    // eslint-disable-next-line db-ux/select-requires-options
    <DBSelect
      id={id}
      label={label}
      showLabel
      variant="floating"
      icon={icon}
      invalidMessage={STANDARD_UNGUELTIG_MELDUNG}
      required
      defaultValue=""
      {...rest}
    >
      {children}
    </DBSelect>
  );
}

export default function PersoenlicheDatenPanel() {
  const emailStatus = useEmailStatus();

  return (
    <div className="raster text-start abstand-3">
      <div className="sp-md-6">
        <Feld id="Vorname" label="Vorname" icon="person" placeholder="Max" required />
      </div>
      <div className="sp-md-6">
        <Feld id="Nachname" label="Nachname" icon="person" placeholder="Mustermann" required />
      </div>
      <div className="sp-md-6">
        <Feld id="PNummer" label="Personalnummer" icon="id_card" placeholder="01234567" required />
      </div>
      <div className="sp-md-6">
        <Feld id="Telefon" label="Telefon" icon="telephone" type="tel" placeholder="0123/45678910" required />
      </div>
      <div className="sp-md-12">
        <DBStack direction="row" alignment="start" gap="x-small" className="feldgruppe">
          <Feld
            id="EmailAnzeige"
            label="E-Mail"
            icon="envelope"
            type="email"
            placeholder="user@deutschebahn.com"
            readOnly
            disabled
            message={emailStatus?.text}
            messageIcon={emailStatus?.icon}
          />
          <DBButton variant="outlined" type="button" id="btnResendVerificationEmail" disabled>
            Verifizierungs-Mail senden
          </DBButton>
        </DBStack>
      </div>
      <div className="sp-md-6">
        <Feld id="Adress1" label="Wohnsitz 1" icon="house" placeholder="Musterstraße 17, 12345 Musterstadt" required />
      </div>
      <div className="sp-md-6">
        <Feld id="Adress2" label="Wohnsitz 2" icon="house" placeholder="Musterstraße 17, 12345 Musterstadt" />
      </div>
      <div className="sp-md-6">
        <Feld id="ErsteTkgSt" label="Erste Tätigkeitsstätte" icon="market" placeholder="Kirchheim" required />
      </div>
      <div className="sp-md-6">
        <Feld
          id="ErsteTkgStAdresse"
          label="Adresse Erste Tätigkeitsstätte"
          icon="market"
          placeholder="Musterstraße 17, 12345 Musterstadt"
          required
        />
      </div>
      <div className="sp-md-6">
        <Auswahl id="Bundesland" label="Bundesland (Feiertage)" icon="map">
          <option value="" disabled>
            Bundesland wählen…
          </option>
          {BUNDESLAENDER.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </Auswahl>
      </div>
      <div className="sp-md-6">
        <Auswahl id="TB" label="Tarif / Beamter" icon="persons" name="TB">
          <option value="" disabled>
            Bitte Wählen
          </option>
          {TB_VALUES.map(wert => (
            <option key={wert} value={wert}>
              {wert}
            </option>
          ))}
        </Auswahl>
      </div>
      <div className="sp-md-6">
        <Feld id="Betrieb" label="Betrieb" icon="market" placeholder="DB Netz AG" required />
      </div>
      <div className="sp-md-6">
        <Feld id="OE" label="OE" icon="market" placeholder="I.NA-MI-N-KSL-IL 03" required />
      </div>
      <div className="sp-md-6">
        <Feld id="Gewerk" label="Gewerk" icon="market" placeholder="LST" required />
      </div>
      <div className="sp-md-6">
        <Feld
          id="Taetigkeit"
          label="Tätigkeit / Stellenbezeichnung"
          icon="person"
          placeholder="Signalmechaniker RBEG"
          dataList={TAETIGKEIT_VORSCHLAEGE}
        />
      </div>
      <div className="sp-md-6">
        <Feld id="Entgeltgruppe" label="Entgeltgruppe (Optional / Entgeltausgleich)" icon="person" placeholder="105" />
      </div>
      <div className="sp-md-6">
        <Feld
          id="kmArbeitsort"
          label="Entfernung zur Arbeitsstätte in km"
          icon="market"
          type="number"
          placeholder="12"
          min={1}
          max={100}
          required
        />
      </div>
      <div className="sp-md-6">
        <Feld id="nBhf" label="nächster Bahnhof" icon="train" placeholder="Bad Hersfeld" required />
      </div>
      <div className="sp-md-6">
        <Feld
          id="kmnBhf"
          label="Entfernung zum nächsten Bahnhof in km"
          icon="train"
          type="number"
          placeholder="12"
          min={1}
          max={100}
          required
        />
      </div>
    </div>
  );
}
