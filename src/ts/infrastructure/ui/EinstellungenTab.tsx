import type { ReactNode } from 'react';
import { DBLoadingButton } from '@/components';
import {
  DBAccordion,
  DBAccordionItem,
  DBButton,
  DBCheckbox,
  DBDivider,
  DBInput,
  DBSection,
  DBStack,
  DBTag,
  DBTooltip,
} from '@db-ux/react-core-components';
import { setOffenenAbschnitt, useOffenenAbschnitt } from '@/infrastructure/ui/offenerAbschnittStore';
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
/**
 * Ein Abschnitt des Einstellungen-Akkordeons. Der "offen"-Zustand liegt im
 * `offenerAbschnittStore` (genau ein Abschnitt offen, von aussen oeffenbar) statt in
 * `behavior="single"` -- siehe dort zur Begruendung.
 */
function Abschnitt({ id, titel, children }: { id: string; titel: string; children: ReactNode }) {
  const offen = useOffenenAbschnitt() === id;
  return (
    // `Abschnitt` wird nur unterhalb des `DBAccordion` in `EinstellungenTab` gerendert; die
    // statische Regel sieht die Komponentengrenze nicht.
    // eslint-disable-next-line db-ux/sub-component-required-parent
    <DBAccordionItem
      id={id}
      headlinePlain={titel}
      open={offen}
      onToggle={istOffen => setOffenenAbschnitt(istOffen ? id : null)}
    >
      {children}
    </DBAccordionItem>
  );
}

export default function EinstellungenTab() {
  return (
    <DBSection width="medium" spacing="none" className="text-center">
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

        <DBAccordion id="einstellungen" variant="card">
          <Abschnitt id="collapseOne" titel="Persönliche Daten">
            <PersoenlicheDatenPanel />
          </Abschnitt>
          <Abschnitt id="collapsePasskeys" titel="Sicherheit">
            <div className="text-start">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
                <div>
                  <h6 className="mb-1 d-flex align-items-center gap-2">
                    Registrierte Biometrie-Anmeldungen
                    <DBTag semantic="neutral" emphasis="strong" id="PasskeyAccordionCount">
                      0
                    </DBTag>
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
          </Abschnitt>
          <Abschnitt id="collapseTwo" titel="Arbeitszeit">
            <div>
              <div id="arbeitszeit-panel"></div>
            </div>
          </Abschnitt>
          <Abschnitt id="collapseThree" titel="Bereitschaft">
            <div className="raster abstand-3">
              <div className="db-table" data-width="full" data-variant="zebra" data-divider="both" data-size="small">
                <VorgabenBTable />
              </div>
            </div>
          </Abschnitt>
          <Abschnitt id="collapseFour" titel="Fahrzeiten">
            <div className="raster abstand-3">
              <div id="fahrzeiten-panel"></div>
            </div>
          </Abschnitt>
          <Abschnitt id="collapseFive" titel="Einstellungen & Bereiche">
            <div>
              <div className="d-flex flex-column gap-4">
                {/* Sichtbare Bereiche */}
                <div>
                  <h6 className="fw-bold mb-3">Sichtbare Bereiche</h6>
                  <p className="text-muted small mb-3">Welche Bereiche sollen in der Navigation sichtbar sein?</p>
                  <div className="d-flex flex-column gap-2">
                    <DBCheckbox id="tab-bereitschaft" label="Bereitschaft" data-tab-key="bereitschaft" />
                    <DBCheckbox id="tab-ewt" label="EWT" data-tab-key="ewt" />
                    <DBCheckbox id="tab-neben" label="Nebenbezüge" data-tab-key="neben" />
                    <DBCheckbox id="tab-ea" label="Entgeltausgleich" data-tab-key="ea" />
                  </div>
                </div>

                <DBDivider width="full" margin="none" />

                {/* AutoSave */}
                <div>
                  <h6 className="fw-bold mb-3">AutoSave</h6>
                  <div className="d-flex flex-column gap-3">
                    <DBCheckbox id="autoSaveEnabled" label="AutoSave aktivieren" data-settings-key="autoSaveEnabled" />
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
          </Abschnitt>
          <Abschnitt id="collapseSix" titel="Zulagen">
            <div className="d-flex flex-column align-items-start gap-2">
              <p className="text-muted mb-0">Wähle die benötigten Zulagen für die Nebengeld-Erfassung.</p>
              <div id="settings-zulagen-list" className="w-100 d-flex flex-column gap-2"></div>
            </div>
          </Abschnitt>
        </DBAccordion>
      </form>
    </DBSection>
  );
}
