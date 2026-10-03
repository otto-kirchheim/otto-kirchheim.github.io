import { Fragment, type ReactNode } from 'react';
import DBLoadingButton from '@/shared/ui/button-loading/DBLoadingButton';
import { featureRegistry } from '@/shared/lib/feature';
import {
  DBAccordion,
  DBAccordionItem,
  DBButton,
  DBCheckbox,
  DBDivider,
  DBHeadingH1,
  DBHeadingH6,
  DBInfotext,
  DBInput,
  DBSection,
  DBStack,
  DBTag,
  DBTooltip,
} from '@db-ux/react-core-components';
import { setOffenenAbschnitt, useOffenenAbschnitt } from '@/shared/model/navigation/offenerAbschnittStore';
import PersoenlicheDatenPanel from '@/pages/einstellungen/ui/PersoenlicheDatenPanel';
import type { IEinstellungenSection } from '@/types';
import { useEinstellungenTeile } from '@/shared/model/einstellungen/einstellungenTeile';
import useFeatureTabsVisible from '@/shared/model/navigation/useFeatureTabsVisible';

/**
 * Ein Abschnitt des Einstellungen-Akkordeons. Der "offen"-Zustand liegt im
 * `offenerAbschnittStore` (genau ein Abschnitt offen, von aussen oeffenbar) statt in
 * `behavior="single"` -- siehe dort zur Begruendung.
 *
 * @param props - `id` des Abschnitts, `titel` der Kopfzeile, `children` als Inhalt; `versteckt` blendet den Abschnitt aus (`abschnitt-versteckt`; `hidden` landet bei `DBAccordionItem` auf dem inneren `<details>`, nicht auf dem Listenelement),
 *   ohne ihn abzubauen (Felder und Werte bleiben erhalten, `saveEinstellungen` sammelt sie weiter).
 */
function Abschnitt({
  id,
  titel,
  children,
  versteckt = false,
}: {
  id: string;
  titel: string;
  children: ReactNode;
  versteckt?: boolean;
}) {
  const offen = useOffenenAbschnitt() === id;
  return (
    <DBAccordionItem
      id={id}
      className={versteckt ? 'abschnitt-versteckt' : undefined}
      headlinePlain={titel}
      open={offen}
      onToggle={istOffen => setOffenenAbschnitt(istOffen ? id : null)}
    >
      {children}
    </DBAccordionItem>
  );
}

/**
 * Abschnitt eines Features aus dessen Einstellungen-Slot.
 *
 * @param props - `section`: Id, Titel und Inhalt des Abschnitts; `versteckt`, wenn das Feature in den Einstellungen deaktiviert ist.
 */
function FeatureAbschnitt({ section, versteckt }: { section: IEinstellungenSection; versteckt: boolean }) {
  return (
    <Abschnitt id={section.id} titel={section.titel} versteckt={versteckt}>
      <section.Component />
    </Abschnitt>
  );
}

/**
 * Einstellungen-Tab (Toolbar, Jahr-Formular, Accordion), gemountet in die `#Einstellungen`-Tab-Pane.
 *
 * Rein praesentational: die Verkabelung (`Einstellungen/index.ts`, `saveEinstellungen.ts`,
 * `generateEingabeMaskeEinstellungen.ts`, `selectYear.ts`, ...) liest und schreibt jedes Feld per
 * `document.querySelector('#<Id>')`, die IDs sind deshalb ein Vertrag.
 * - `#PasskeyList` bleibt leerer Container, den `renderPasskeyList` (`Einstellungen/index.ts`) per DOM befuellt.
 * - `#arbeitszeit-panel` ist ein leerer Container fuer einen eigenen React-Root, den `generateEingabeMaskeEinstellungen.ts`
 *   per `mount()` einhaengt.
 * - Die Abschnitte der Features (Bereitschaft `collapseThree`, Fahrzeiten `collapseFour`, Zulagen `collapseSix`) liefern deren
 *   Einstellungen-Slots (`einstellungenTeile.ts`): samt Containern (`#fahrzeiten-panel`, `#settings-zulagen-list`), Tabelle `#tableVE`
 *   sowie Befuellen (`read`) und Einsammeln (`collect`) ihrer Felder. Die Reihenfolge im Akkordeon bestimmt `order`.
 * - `#collapseFive` als Eltern-Id: `saveEinstellungen.ts` scopt seine `[data-tab-key]`-Suche darauf.
 */
export default function EinstellungenTab() {
  // Abschnitte der Features (Bereitschaft, Fahrzeiten, Zulagen ...) aus deren Einstellungen-Slot, nach `order` zwischen den globalen.
  // Abschnitte deaktivierter Features ("Sichtbare Bereiche") sind ausgeblendet, sobald `aktivierteTabs` gesetzt ist (`updateTabVisibility`).
  const featureTabs = useFeatureTabsVisible();
  const featureAbschnitte = useEinstellungenTeile().flatMap(teil => {
    const navId = featureRegistry.meta(teil.id)?.legacy.navId;
    const versteckt = navId !== undefined && !featureTabs.nav(navId);
    return teil.part.sections.map(section => ({
      order: section.order,
      key: section.id,
      node: <FeatureAbschnitt section={section} versteckt={versteckt} />,
    }));
  });
  const globaleAbschnitte = [
    {
      order: 10,
      key: 'collapseOne',
      node: (
        <Abschnitt id="collapseOne" titel="Persönliche Daten">
          <PersoenlicheDatenPanel />
        </Abschnitt>
      ),
    },
    {
      order: 20,
      key: 'collapsePasskeys',
      node: (
        <Abschnitt id="collapsePasskeys" titel="Sicherheit">
          <div className="ausrichtung-start">
            <div className="passkey-kopf">
              <DBStack gap="2x-small" alignment="start">
                <DBHeadingH6 className="titel-mit-tag">
                  Registrierte Biometrie-Anmeldungen
                  <DBTag semantic="neutral" emphasis="strong" id="PasskeyAccordionCount">
                    0
                  </DBTag>
                </DBHeadingH6>
                <DBInfotext showIcon={false} className="infotext-block passkey-info">
                  Login ohne Passwort per Fingerprint, Face ID oder Geräte-PIN.
                </DBInfotext>
                <span id="PasskeyStatus" className="db-infotext" data-size="small" data-show-icon-leading="false">
                  Biometrie-Status wird geladen...
                </span>
              </DBStack>
              <DBStack direction="column" gap="x-small">
                {/* Haupt-Aktion als gefuellter Knopf, Zweit-Aktionen nur umrandet. Kein Rot: das
                         DB-Regelwerk laesst roten Text nur fuer Links und Warnungen zu. */}
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
      ),
    },
    {
      order: 30,
      key: 'collapseTwo',
      node: (
        <Abschnitt id="collapseTwo" titel="Arbeitszeit">
          <div>
            <div id="arbeitszeit-panel"></div>
          </div>
        </Abschnitt>
      ),
    },
    {
      order: 50,
      key: 'collapseFive',
      node: (
        <Abschnitt id="collapseFive" titel="Einstellungen & Bereiche">
          <div>
            <DBStack gap="medium" alignment="stretch">
              <DBStack gap="small">
                <DBHeadingH6>Sichtbare Bereiche</DBHeadingH6>
                <DBInfotext showIcon={false}>Welche Bereiche sollen in der Navigation sichtbar sein?</DBInfotext>
                <DBStack gap="x-small">
                  {featureRegistry.metas().map(({ label, legacy }) => (
                    <DBCheckbox
                      id={`tab-${legacy.tabKey}`}
                      label={label}
                      data-tab-key={legacy.tabKey}
                      key={legacy.tabKey}
                    />
                  ))}
                </DBStack>
              </DBStack>

              <DBDivider width="full" margin="none" />

              <DBStack gap="small">
                <DBHeadingH6>AutoSave</DBHeadingH6>
                <DBStack gap="small">
                  <DBCheckbox id="autoSaveEnabled" label="AutoSave aktivieren" data-settings-key="autoSaveEnabled" />
                  <div>
                    <label htmlFor="autoSaveDelay">
                      Verzögerung: <strong id="autoSaveDelayLabel">10 s</strong>
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
                    <DBInfotext showIcon={false} className="infotext-block">
                      1 Sekunde bis 5 Minuten
                    </DBInfotext>
                  </div>
                </DBStack>
              </DBStack>
            </DBStack>
          </div>
        </Abschnitt>
      ),
    },
  ];
  const abschnitte = [...globaleAbschnitte, ...featureAbschnitte].sort((a, b) => a.order - b.order);

  return (
    <DBSection width="medium" spacing="none" className="tab-abschnitt">
      <DBHeadingH1 className="titel-mit-hilfe">
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
      </DBHeadingH1>

      {/* Ausloggen liegt in der Shell-Kopfzeile (`AppHeader.tsx`, `actions2`), Passwort Ändern im
          Abschnitt "Sicherheit". */}
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

            <DBLoadingButton variant="brand" type="submit" id="btnAuswaehlen" name="Auswählen" data-disabler>
              Auswählen
            </DBLoadingButton>
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
          className="einstellungen-speichern"
        >
          Speichern
        </DBLoadingButton>

        <DBAccordion id="einstellungen" variant="card">
          {abschnitte.map(abschnitt => (
            <Fragment key={abschnitt.key}>{abschnitt.node}</Fragment>
          ))}
        </DBAccordion>
      </form>
    </DBSection>
  );
}
