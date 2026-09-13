import { TB_VALUES } from '@otto-kirchheim/nebengeld-shared';

/**
 * Phase L3: "Persönliche Daten"-Accordion-Panel (ehemals `index.html`, `#collapseOne`-Inhalt)
 * als React-Komponente. Rein praesentational -- alle Feld-IDs 1:1 uebernommen, denn
 * `generateEingabeMaskeEinstellungen.ts`/`saveEinstellungen.ts` lesen/schreiben jedes Feld
 * ausschliesslich per `document.querySelector('#<Feldname>')` (Feld-Id === `IVorgabenUPers`-Key)
 * -- unveraendert gueltig, unabhaengig davon, ob React oder statisches HTML das Element erzeugt
 * hat. Keine dieser Dateien musste fuer den Umbau angefasst werden.
 */

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

export default function PersoenlicheDatenPanel() {
  return (
    <div className="raster text-start abstand-3">
      <div className="sp-md-6">
        <div className="db-input" data-variant="floating" data-icon="person">
          <label htmlFor="Vorname">Vorname</label>
          <input type="text" placeholder="Max" id="Vorname" required />
        </div>
      </div>
      <div className="sp-md-6">
        <div className="db-input" data-variant="floating" data-icon="person">
          <label htmlFor="Nachname">Nachname</label>
          <input type="text" placeholder="Mustermann" id="Nachname" required />
        </div>
      </div>
      <div className="sp-md-6">
        <div className="db-input" data-variant="floating" data-icon="id_card">
          <label htmlFor="PNummer">Personalnummer</label>
          <input type="text" placeholder="01234567" id="PNummer" required />
        </div>
      </div>
      <div className="sp-md-6">
        <div className="db-input" data-variant="floating" data-icon="telephone">
          <label htmlFor="Telefon">Telefon</label>
          <input type="tel" id="Telefon" placeholder="0123/45678910" required />
        </div>
      </div>
      <div>
        <div className="feldgruppe">
          <div className="db-input" data-variant="floating" data-icon="envelope">
            <label htmlFor="EmailAnzeige">E-Mail</label>
            <input type="email" id="EmailAnzeige" placeholder="user@deutschebahn.com" readOnly disabled />
          </div>
          <button className="db-button" data-variant="outlined" type="button" id="btnResendVerificationEmail" disabled>
            Verifizierungs-Mail senden
          </button>
        </div>
      </div>
      <span id="EmailVerificationHint" className="db-infotext" data-size="small" data-show-icon-leading="false"></span>
      <div>
        <div className="db-input" data-variant="floating" data-icon="house">
          <label htmlFor="Adress1">Wohnsitz 1</label>
          <input type="text" placeholder="Musterstraße 17, 12345 Musterstadt" id="Adress1" required />
        </div>
      </div>
      <div>
        <div className="db-input" data-variant="floating" data-icon="house">
          <label htmlFor="Adress2">Wohnsitz 2</label>
          <input type="text" placeholder="Musterstraße 17, 12345 Musterstadt" id="Adress2" />
        </div>
      </div>
      <div className="sp-md-6">
        <div className="db-input" data-variant="floating" data-icon="market">
          <label htmlFor="ErsteTkgSt">Erste Tätigkeitsstätte</label>
          <input type="text" placeholder="Kirchheim" id="ErsteTkgSt" required />
        </div>
      </div>
      <div className="sp-md-6">
        <div className="db-input" data-variant="floating" data-icon="market">
          <label htmlFor="ErsteTkgStAdresse">Adresse Erste Tätigkeitsstätte</label>
          <input type="text" placeholder="Musterstraße 17, 12345 Musterstadt" id="ErsteTkgStAdresse" required />
        </div>
      </div>
      <div className="sp-md-6">
        <div className="db-select" data-variant="floating" data-icon="map">
          <label htmlFor="Bundesland">Bundesland (Feiertage)</label>
          <select id="Bundesland" defaultValue="">
            <option value="" disabled>
              Bundesland wählen…
            </option>
            {BUNDESLAENDER.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="sp-md-6">
        <div className="db-select" data-variant="floating" data-icon="persons">
          <label htmlFor="TB">Tarif / Beamter</label>
          <select id="TB" name="TB" required defaultValue="">
            <option value="" disabled>
              Bitte Wählen
            </option>
            {TB_VALUES.map(wert => (
              <option key={wert} value={wert}>
                {wert}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="sp-md-6">
        <div className="db-input" data-variant="floating" data-icon="market">
          <label htmlFor="Betrieb">Betrieb</label>
          <input type="text" placeholder="DB Netz AG" id="Betrieb" required />
        </div>
      </div>
      <div className="sp-md-6">
        <div className="db-input" data-variant="floating" data-icon="market">
          <label htmlFor="OE">OE</label>
          <input type="text" placeholder="I.NA-MI-N-KSL-IL 03" id="OE" required />
        </div>
      </div>
      <div className="sp-md-6">
        <div className="db-input" data-variant="floating" data-icon="market">
          <label htmlFor="Gewerk">Gewerk</label>
          <input type="text" placeholder="LST" id="Gewerk" required />
        </div>
      </div>
      <div className="sp-md-6">
        <div className="db-input" data-variant="floating" data-icon="person">
          <label htmlFor="Taetigkeit">Tätigkeit / Stellenbezeichnung</label>
          <input type="text" placeholder="Signalmechaniker RBEG" id="Taetigkeit" list="taetigkeitVorschlaege" />
          <datalist id="taetigkeitVorschlaege">
            <option value="Arbeiter"></option>
            <option value="Facharbeiter"></option>
            <option value="Signalmechaniker"></option>
            <option value="Signalmechaniker RBEG"></option>
            <option value="Meister"></option>
          </datalist>
        </div>
      </div>
      <div className="sp-md-6">
        <div className="db-input" data-variant="floating" data-icon="person">
          <label htmlFor="Entgeltgruppe">Entgeltgruppe (Optional / Entgeltausgleich)</label>
          <input type="text" placeholder="105" id="Entgeltgruppe" />
        </div>
      </div>
      <div className="sp-md-6">
        <div className="db-input" data-variant="floating" data-icon="market">
          <label htmlFor="kmArbeitsort">Entfernung zur Arbeitsstätte in km</label>
          <input type="number" placeholder="12" id="kmArbeitsort" min="1" max="100" required />
        </div>
      </div>
      <div className="sp-md-6">
        <div className="db-input" data-variant="floating" data-icon="train">
          <label htmlFor="nBhf">nächster Bahnhof</label>
          <input type="text" placeholder="Bad Hersfeld" id="nBhf" required />
        </div>
      </div>
      <div className="sp-md-6">
        <div className="db-input" data-variant="floating" data-icon="train">
          <label htmlFor="kmnBhf">Entfernung zum nächsten Bahnhof in km</label>
          <input type="number" placeholder="12" id="kmnBhf" min="1" max="100" required />
        </div>
      </div>
    </div>
  );
}
