import { DBLoadingButton } from '@/components';
import PersoenlicheDatenPanel from '@/features/Einstellungen/components/PersoenlicheDatenPanel';

/**
 * Phase L3: Einstellungen-Tab-Huelle (ehemals `index.html`: Toolbar, Jahr-Formular,
 * Accordion-Geruest) als React-Komponente, gemountet direkt in die `#Einstellungen`-Tab-Pane
 * (analog `StartTab`/`BerechnungTab` aus L1/L2 -- kein Wrapper-Div).
 *
 * Rein praesentational -- die gesamte Verkabelung (`Einstellungen/index.ts`,
 * `saveEinstellungen.ts`, `generateEingabeMaskeEinstellungen.ts`, `selectYear.ts`, ...) bleibt
 * bewusst unveraendert: sie liest/schreibt jedes Feld ausschliesslich per
 * `document.querySelector('#<Id>')`, unabhaengig davon, ob React oder statisches HTML das
 * Element erzeugt hat. Alle IDs/Klassen/Attribute deshalb 1:1 uebernommen -- keine dieser
 * Dateien musste fuer den Umbau angefasst werden:
 * - `#PasskeyList`/`#settings-zulagen-list` bleiben leere Container, die von `index.ts`
 *   (`renderPasskeyList`) bzw. `generateEingabeMaskeEinstellungen.ts`
 *   (`populateZulagenCheckboxes`) weiterhin per plain-DOM (`document.createElement`) befuellt
 *   werden -- kein React-Root, unveraendert.
 * - `#arbeitszeit-panel`/`#fahrzeiten-panel` bleiben leere Container fuer die bereits
 *   bestehenden, unabhaengigen React-Roots (`ArbeitszeiteingabePanel`/`FahrzeitenPanel`, per
 *   `mount()` aus `generateEingabeMaskeEinstellungen.ts` -- exakt das gleiche
 *   Leerer-Blatt-Prinzip wie `#berechnungMobileCards` in `BerechnungTab.tsx`).
 * - `<table id="tableVE">` bleibt eine `CustomTable`-Instanz (Vanilla-DOM) -- Migration dafuer
 *   erst in einer spaeteren Phase M.
 * - `#collapseFive` als Eltern-Id bleibt bestehen: `generateEingabeMaskeEinstellungen.ts`/
 *   `saveEinstellungen.ts` scopen ihre `[data-tab-key]`-Suche darauf.
 */
export default function EinstellungenTab() {
  return (
    <div className="mitte text-center mb-3">
      <div>
        <h1 className="d-inline-flex align-items-center justify-content-center gap-2">
          Einstellungen
          <button
            type="button"
            className="db-button p-0"
            data-variant="ghost"
            data-size="small"
            id="btnHelpEinstellungen"
            aria-label="Hilfe anzeigen"
          >
            <span className="db-icon align-middle" data-icon="question_mark_circle" style={{ fontSize: '1.25rem' }} />
          </button>
        </h1>
      </div>

      <div className="mitte">
        <div className="raster-auto mb-3 knopfreihe abstand-3">
          <div className="d-grid">
            <button className="db-button" data-variant="brand" type="button" name="Logout" id="btnLogout">
              Ausloggen
            </button>
          </div>
          <div className="d-grid">
            <button
              className="db-button"
              data-variant="filled"
              type="button"
              name="PasswortAEndern"
              id="btnPasswortAEndern"
            >
              Passwort Ändern
            </button>
          </div>
        </div>
      </div>

      <div className="mitte">
        <form id="formSelectMonatJahr" className="my-3">
          <div className="feldgruppe jahr-auswahl">
            <div className="db-input" data-variant="floating" data-icon="calendar" data-has-tooltip="true">
              <label htmlFor="Jahr">Jahr</label>
              <input id="Jahr" type="number" placeholder="2026" min="2021" max="2030" required />
              <i role="tooltip" className="db-tooltip" data-placement="top">
                Achtung: Vor Jahreswechsel Speichern!!
              </i>
            </div>
            <button
              className="db-button"
              data-variant="brand"
              type="submit"
              id="btnAuswaehlen"
              name="Auswählen"
              data-disabler
            >
              Auswählen
            </button>
          </div>
        </form>
      </div>

      <form className="text-center" id="formEinstellungen">
        <div className="mitte">
          <div className="raster-auto my-3 knopfreihe abstand-3">
            <div className="d-grid">
              <DBLoadingButton
                type="submit"
                variant="filled"
                data-color="successful"
                name="btnES"
                id="btnSaveEinstellungen"
                icon="save"
                data-disabler
                autoSaveResources={['settings']}
              >
                Speichern
              </DBLoadingButton>
            </div>
          </div>
        </div>
        <ul className="db-accordion" id="einstellungen" data-variant="card">
          <li className="db-accordion-item">
            <details name="einstellungen" id="collapseOne">
              <summary>Persönliche Daten</summary>
              <PersoenlicheDatenPanel />
            </details>
          </li>
          <li className="db-accordion-item" id="PasskeysAccordionItem">
            <details name="einstellungen" id="collapsePasskeys">
              <summary>Biometrie & Geräte</summary>
              <div className="text-start">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
                  <div>
                    <h6 className="mb-1 d-flex align-items-center gap-2">
                      Registrierte Biometrie-Anmeldungen
                      <span
                        className="db-tag"
                        data-semantic="neutral"
                        data-emphasis="strong"
                        id="PasskeyAccordionCount"
                      >
                        0
                      </span>
                    </h6>
                    <p className="text-body-secondary small mb-1">
                      Login ohne Passwort per Fingerprint, Face ID oder Geräte-PIN.
                    </p>
                    <span id="PasskeyStatus" className="db-infotext" data-size="small" data-show-icon-leading="false">
                      Biometrie-Status wird geladen...
                    </span>
                  </div>
                  <div className="d-flex flex-column gap-2">
                    {/* Haupt-Aktion als gefuellter Knopf, die Zweit-Aktion darunter nur
                         umrandet. Kein Rot: das DB-Regelwerk laesst roten Text nur fuer
                         Links und Warnungen zu (Markenfarben, Double Coding). */}
                    <button className="db-button" data-variant="filled" type="button" id="btnAddPasskeyInline" disabled>
                      Biometrie einrichten
                    </button>
                    <button
                      className="db-button"
                      data-variant="outlined"
                      type="button"
                      id="btnPasswortPerPasskey"
                      hidden
                    >
                      Passwort per Passkey neu setzen
                    </button>
                  </div>
                </div>
                <div className="trennliste" id="PasskeyList"></div>
              </div>
            </details>
          </li>
          <li className="db-accordion-item">
            <details name="einstellungen" id="collapseTwo">
              <summary>Arbeitszeit</summary>
              <div>
                <div id="arbeitszeit-panel"></div>
              </div>
            </details>
          </li>
          <li className="db-accordion-item">
            <details name="einstellungen" id="collapseThree">
              <summary>Bereitschaft</summary>
              <div className="raster abstand-3">
                <div className="db-table" data-width="full" data-variant="zebra" data-divider="both" data-size="small">
                  <table id="tableVE" className="align-middle" aria-label="Voreinstellungen Bereitschaft"></table>
                </div>
              </div>
            </details>
          </li>
          <li className="db-accordion-item">
            <details name="einstellungen" id="collapseFour">
              <summary>Fahrzeiten</summary>
              <div className="raster abstand-3">
                <div id="fahrzeiten-panel"></div>
              </div>
            </details>
          </li>
          <li className="db-accordion-item">
            <details name="einstellungen" id="collapseFive">
              <summary>Einstellungen & Bereiche</summary>
              <div>
                <div className="d-flex flex-column gap-4">
                  {/* Sichtbare Bereiche */}
                  <div>
                    <h6 className="fw-bold mb-3">Sichtbare Bereiche</h6>
                    <p className="text-muted small mb-3">Welche Bereiche sollen in der Navigation sichtbar sein?</p>
                    <div className="d-flex flex-column gap-2">
                      <div className="db-switch">
                        <label htmlFor="tab-bereitschaft">
                          <input type="checkbox" role="switch" id="tab-bereitschaft" data-tab-key="bereitschaft" />
                          Bereitschaft
                        </label>
                      </div>
                      <div className="db-switch">
                        <label htmlFor="tab-ewt">
                          <input type="checkbox" role="switch" id="tab-ewt" data-tab-key="ewt" />
                          EWT
                        </label>
                      </div>
                      <div className="db-switch">
                        <label htmlFor="tab-neben">
                          <input type="checkbox" role="switch" id="tab-neben" data-tab-key="neben" />
                          Nebenbezüge
                        </label>
                      </div>
                      <div className="db-switch">
                        <label htmlFor="tab-ea">
                          <input type="checkbox" role="switch" id="tab-ea" data-tab-key="ea" />
                          Entgeltausgleich
                        </label>
                      </div>
                    </div>
                  </div>

                  <hr className="my-0" />

                  {/* AutoSave */}
                  <div>
                    <h6 className="fw-bold mb-3">AutoSave</h6>
                    <div className="d-flex flex-column gap-3">
                      <div className="db-switch">
                        <label htmlFor="autoSaveEnabled">
                          <input
                            type="checkbox"
                            role="switch"
                            id="autoSaveEnabled"
                            data-settings-key="autoSaveEnabled"
                          />
                          AutoSave aktivieren
                        </label>
                      </div>
                      <div>
                        <label htmlFor="autoSaveDelay">
                          Verzögerung:{' '}
                          <span id="autoSaveDelayLabel" className="fw-semibold">
                            10 s
                          </span>
                        </label>
                        <input
                          type="range"
                          id="autoSaveDelay"
                          data-settings-key="autoSaveDelayMs"
                          min="0"
                          max="24"
                          defaultValue="9"
                          step="1"
                        />
                        <div className="text-muted small">1 Sekunde bis 5 Minuten</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </li>
          <li className="db-accordion-item">
            <details name="einstellungen" id="collapseSix">
              <summary>Zulagen</summary>
              <div className="d-flex flex-column align-items-start gap-2">
                <p className="text-muted mb-0">Wähle die benötigten Zulagen für die Nebengeld-Erfassung.</p>
                <div id="settings-zulagen-list" className="w-100 d-flex flex-column gap-2"></div>
              </div>
            </details>
          </li>
        </ul>
      </form>
    </div>
  );
}
