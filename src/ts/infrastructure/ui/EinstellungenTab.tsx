import { DBLoadingButton } from '@/components';
import { DBButton, DBDivider, DBInput, DBStack, DBTooltip } from '@db-ux/react-core-components';
import PersoenlicheDatenPanel from '@/features/Einstellungen/components/PersoenlicheDatenPanel';
import VorgabenBTable from '@/features/Einstellungen/components/VorgabenBTable';

/**
 * Phase L3: Einstellungen-Tab-Huelle (ehemals `index.html`: Toolbar, Jahr-Formular,
 * Accordion-Geruest) als React-Komponente, gemountet direkt in die `#Einstellungen`-Tab-Pane
 * (analog `StartTab`/`BerechnungTab` aus L1/L2 -- kein Wrapper-Div).
 *
 * Rein praesentational -- die gesamte Verkabelung (`Einstellungen/index.ts`,
 * `saveEinstellungen.ts`, `generateEingabeMaskeEinstellungen.ts`, `selectYear.ts`, ...) bleibt
 * bewusst unveraendert: sie liest/schreibt jedes Feld ausschliesslich per
 * `document.querySelector('#<Id>')`, unabhaengig davon, ob React oder statisches HTML das
 * Element erzeugt hat. Alle IDs behalten deshalb ihren Wert -- nur die reine Markup-Huelle
 * (Knopf-Reihen als `<DBStack>`/`<DBButton>` statt Hand-Markup, siehe Umbau "Flex-Layouts ->
 * DBStack") wurde angepasst:
 * - `#PasskeyList` bleibt leerer Container, der von `index.ts` (`renderPasskeyList`) weiterhin
 *   per plain-DOM (`document.createElement`) befuellt wird -- kein React-Root, unveraendert.
 * - `#arbeitszeit-panel`/`#fahrzeiten-panel`/`#settings-zulagen-list` bleiben leere Container
 *   fuer die bereits bestehenden, unabhaengigen React-Roots
 *   (`ArbeitszeiteingabePanel`/`FahrzeitenPanel`/`ZulagenCheckboxList`, per `mount()` aus
 *   `generateEingabeMaskeEinstellungen.ts` -- exakt das gleiche Leerer-Blatt-Prinzip wie
 *   `#berechnungMobileCards` in `BerechnungTab.tsx`).
 * - `#tableVE` ist seit Achse B des `useReducer`-Umbaus eine eigene Feature-Komponente
 *   (`VorgabenBTable`, siehe `features/Einstellungen/components/`) statt eines rohen
 *   `<table>` -- ausgelagert, weil diese Huelle bewusst infrastructure-schichtig ist und laut
 *   Architektur nicht auf `features/` zugreifen darf (analog `PersoenlicheDatenPanel`).
 * - `#collapseFive` als Eltern-Id bleibt bestehen: `generateEingabeMaskeEinstellungen.ts`/
 *   `saveEinstellungen.ts` scopen ihre `[data-tab-key]`-Suche darauf.
 */
export default function EinstellungenTab() {
  return (
    <div className="mitte text-center">
      <h1 className="d-inline-flex align-items-center justify-content-center">
        Einstellungen
        <DBButton
          variant="ghost"
          size="small"
          type="button"
          id="btnHelpEinstellungen"
          aria-label="Hilfe anzeigen"
          icon={'question_mark_circle'}
          noText
        >
          <DBTooltip placement="top">Hilfe anzeigen</DBTooltip>
        </DBButton>
      </h1>

      {/* Ausloggen wanderte in die Shell-Kopfzeile (siehe AppHeader.tsx "actions2") --
          "Buttons und Elemente sollten ein Raster einhalten"-Feedback plus immer erreichbar
          statt im Tab versteckt. Passwort Ändern wanderte in den Biometrie-Accordion (siehe
          dort) -- Account-Sicherheitsaktionen jetzt an einer Stelle gruppiert. */}
      <DBStack direction="column" alignment="center" justifyContent="center" gap="medium">
        <form id="formSelectMonatJahr">
          <DBStack direction="row" alignment="end" gap="medium" className="knopfreihe-gleich">
            <DBInput
              id="Jahr"
              label="Jahr"
              showLabel
              variant="floating"
              icon="calendar"
              type="number"
              placeholder="2026"
              min={2021}
              max={2030}
              required
              invalidMessage="Bitte ein Jahr zwischen 2021 und 2030 angeben."
            >
              <DBTooltip placement="top">Achtung: Vor Jahreswechsel Speichern!!</DBTooltip>
            </DBInput>

            <DBButton variant="brand" type="submit" id="btnAuswaehlen" name="Auswählen" data-disabler>
              Auswählen
            </DBButton>
          </DBStack>
        </form>
      </DBStack>

      <DBDivider width="full" />

      <form id="formEinstellungen">
        <DBLoadingButton
          type="submit"
          variant="filled"
          data-color="successful"
          name="btnES"
          id="btnSaveEinstellungen"
          icon="save"
          data-disabler
          autoSaveResources={['settings']}
          className="mb-4"
        >
          Speichern
        </DBLoadingButton>

        <ul className="db-accordion" id="einstellungen" data-variant="card">
          <li className="db-accordion-item">
            <details name="einstellungen" id="collapseOne">
              <summary>Persönliche Daten</summary>
              <PersoenlicheDatenPanel />
            </details>
          </li>
          <li className="db-accordion-item" id="PasskeysAccordionItem">
            <details name="einstellungen" id="collapsePasskeys">
              <summary>Sicherheit</summary>
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
                  <DBStack direction="column" gap="x-small">
                    {/* Haupt-Aktion als gefuellter Knopf, die Zweit-Aktionen darunter nur
                         umrandet. Kein Rot: das DB-Regelwerk laesst roten Text nur fuer
                         Links und Warnungen zu (Markenfarben, Double Coding). Passwort Ändern
                         zog von der oberen Knopfreihe her -- Account-Sicherheitsaktionen
                         jetzt an einer Stelle gruppiert. */}
                    <DBButton variant="filled" type="button" id="btnAddPasskeyInline" disabled>
                      Biometrie einrichten
                    </DBButton>
                    <DBButton variant="outlined" type="button" name="PasswortAEndern" id="btnPasswortAEndern">
                      Passwort Ändern
                    </DBButton>
                    <DBButton variant="outlined" type="button" id="btnPasswortPerPasskey" hidden>
                      Passwort per Passkey neu setzen
                    </DBButton>
                  </DBStack>
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
                  <VorgabenBTable />
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
