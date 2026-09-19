import { DBButton, DBCard, DBInfotext, DBTooltip } from '@db-ux/react-core-components';
import { type FC, useEffect, useMemo, useState } from 'react';

// Direktimporte statt Barrel (@/core, @/components), um den Zyklus
// createOnboardingGuideModal → openHelpModal → MyHelpModal → createOnboardingGuideModal zu vermeiden.
import { onEvent } from '@/core/events/appEvents';
import { getHelpContent, type HelpContextKey } from '@/core/help/helpContent';
import { capturePersSnapshot, springeZu, validatePersoenlicheDaten } from './onboardingValidation';

export type TourTab = { tabButtonId: string; titel: string; kurzbeschreibung: string; punkte: string[] };

type GuideStep =
  | { art: 'intro' }
  | { art: 'pers' }
  | {
      art: 'bestaetigung';
      id: 'arbeitszeit' | 'bereitschaft' | 'fahrzeiten';
      titel: string;
      beschreibung: string;
      collapseId: string;
    }
  | { art: 'tour'; tab: TourTab }
  | { art: 'abschluss' };

function istTabSichtbar(tabButtonId: string): boolean {
  const button = document.querySelector<HTMLButtonElement>(tabButtonId);
  if (!button) return false;
  return !button.closest('li')?.classList.contains('d-none');
}

function getTourTabs(): TourTab[] {
  const tabs: TourTab[] = [];
  const helpTabs: { tabButtonId: string; key: HelpContextKey }[] = [
    { tabButtonId: '#bereitschaft-tab', key: 'tab.bereitschaft' },
    { tabButtonId: '#ewt-tab', key: 'tab.ewt' },
    { tabButtonId: '#neben-tab', key: 'tab.neben' },
    { tabButtonId: '#ea-tab', key: 'tab.ea' },
  ];

  for (const { tabButtonId, key } of helpTabs) {
    if (!istTabSichtbar(tabButtonId)) continue;
    const content = getHelpContent(key);
    tabs.push({
      tabButtonId,
      titel: content.title,
      kurzbeschreibung: content.kurzbeschreibung,
      punkte: content.wasKannIchHierMachen,
    });
  }

  if (istTabSichtbar('#berechnung-tab')) {
    tabs.push({
      tabButtonId: '#berechnung-tab',
      titel: 'Berechnung',
      kurzbeschreibung: 'Zeigt die Gesamtberechnung des gewählten Monats.',
      punkte: ['Berechnete Beträge prüfen', 'Monatswerte vergleichen'],
    });
  }

  return tabs;
}

function getStepTitle(step: GuideStep): string {
  switch (step.art) {
    case 'intro':
      return 'Willkommen zur Ersteinrichtung';
    case 'pers':
      return 'Persönliche Daten';
    case 'bestaetigung':
      return step.titel;
    case 'tour':
      return `Tab: ${step.tab.titel}`;
    case 'abschluss':
      return 'Fertig!';
  }
}

const OnboardingGuidePanel: FC<{ captureSnapshot: boolean; onClose: () => void }> = ({ captureSnapshot, onClose }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [minimiert, setMinimiert] = useState(false);
  const [, setVersion] = useState(0);
  const refresh = () => setVersion(version => version + 1);

  useEffect(() => onEvent('data:changed', refresh), []);
  useEffect(() => {
    const handleInput = () => refresh();
    document.addEventListener('input', handleInput, true);
    document.addEventListener('change', handleInput, true);
    return () => {
      document.removeEventListener('input', handleInput, true);
      document.removeEventListener('change', handleInput, true);
    };
  }, []);
  useEffect(() => {
    // Lazy, idempotent: greift erst, sobald VorgabenU nach der Registrierung geladen ist.
    if (captureSnapshot) capturePersSnapshot();
  });

  const tourTabs = useMemo(() => getTourTabs(), []);

  const steps: GuideStep[] = useMemo(
    () => [
      { art: 'intro' },
      { art: 'pers' },
      {
        art: 'bestaetigung',
        id: 'arbeitszeit',
        titel: 'Arbeitszeit prüfen',
        beschreibung:
          'Prüfe, ob die Schichtzeiten (Früh/Spät/Nacht/Sonder) und die Fahrzeit zu dir passen, und passe sie bei Bedarf direkt dort an.',
        collapseId: '#collapseTwo',
      },
      {
        art: 'bestaetigung',
        id: 'bereitschaft',
        titel: 'Bereitschaft prüfen',
        beschreibung:
          'Prüfe, ob die Vorlagen (Wochentage, Zeiträume und Schichten) deiner Bereitschaftsplanung entsprechen.',
        collapseId: '#collapseThree',
      },
      {
        art: 'bestaetigung',
        id: 'fahrzeiten',
        titel: 'Fahrzeiten prüfen',
        beschreibung: 'Prüfe, ob alle deine Einsatzorte mit den passenden Fahrzeiten hinterlegt sind.',
        collapseId: '#collapseFour',
      },
      ...tourTabs.map(tab => ({ art: 'tour', tab }) as const),
      { art: 'abschluss' },
    ],
    [tourTabs],
  );

  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;
  const letzterTourTab = tourTabs.at(-1)?.tabButtonId;
  const persValidation = validatePersoenlicheDaten();

  useEffect(() => {
    // Beim Aufrufen eines Einstellungs-Schritts den zugehörigen Bereich automatisch öffnen und
    // visuell fokussieren, damit der Nutzer direkt dort vergleicht.
    if (step.art === 'tour') {
      springeZu(step.tab.tabButtonId);
      return;
    }

    const collapseId =
      step.art === 'intro' || step.art === 'pers'
        ? '#collapseOne'
        : step.art === 'bestaetigung'
          ? step.collapseId
          : null;
    if (!collapseId) return;

    springeZu('#einstellungen-tab', collapseId);
    const accordionItem = document.querySelector(collapseId)?.closest('.db-accordion-item');
    accordionItem?.classList.add('onboarding-focus');
    return () => accordionItem?.classList.remove('onboarding-focus');
  }, [step]);

  const weiterErlaubt = step.art === 'pers' ? persValidation.ok : true;
  const weiterText = 'Weiter';
  const weiter = () => {
    if (step.art === 'tour' && step.tab.tabButtonId === letzterTourTab) {
      void springeZu('#brand-start-tab');
    }
    setStepIndex(index => index + 1);
  };

  const titel = getStepTitle(step);

  return (
    <DBCard className="shadow" spacing="none">
      <div className="d-flex align-items-center gap-2 py-2 px-3 bg-body-secondary border-bottom">
        <strong className="me-auto">Ersteinrichtung</strong>
        <span className="text-body-secondary small">
          Schritt {stepIndex + 1} von {steps.length}
        </span>
        <DBButton
          type="button"
          className="p-0"
          variant="ghost"
          size="small"
          icon={minimiert ? 'chevron_up' : 'chevron_down'}
          noText
          aria-label={minimiert ? 'Ersteinrichtung ausklappen' : 'Ersteinrichtung minimieren'}
          onClick={() => setMinimiert(m => !m)}
        >
          <DBTooltip>{minimiert ? 'Ersteinrichtung ausklappen' : 'Ersteinrichtung minimieren'}</DBTooltip>
        </DBButton>
      </div>

      {!minimiert && (
        <div className="d-flex flex-column gap-2 overflow-auto p-3" style={{ maxHeight: '45vh' }}>
          <h6 className="mb-0">{titel}</h6>

          {step.art === 'intro' && (
            <>
              <p className="mb-0">Ich führe dich Schritt für Schritt durch die Einrichtung. </p>
              <p className="mb-0 text-body-secondary small">
                Du kannst die Ersteinrichtung jederzeit über die Hilfe im Start-Tab erneut öffnen.
              </p>
            </>
          )}

          {step.art === 'pers' && (
            <>
              <p className="mb-0">
                Bitte fülle alle persönlichen Daten aus. Einige Felder sind schon passend vorausgefüllt – prüfe sie kurz
                und ersetze die Beispielwerte durch deine eigenen Angaben.
              </p>
              <p className="text-body-secondary small mb-0">
                Wichtig: Vorname, Nachname, Personalnummer, Telefon, Wohnsitz sowie die Entfernungen zur Arbeitsstätte
                und zum nächsten Bahnhof.
              </p>
              {persValidation.ok ? (
                <DBInfotext semantic="successful">Alle Pflichtangaben sind eingetragen.</DBInfotext>
              ) : (
                <DBInfotext semantic="warning">Noch offen: {persValidation.offeneFelder.join(', ')}</DBInfotext>
              )}
            </>
          )}

          {step.art === 'bestaetigung' && (
            <>
              <p className="mb-0">{step.beschreibung}</p>
            </>
          )}

          {step.art === 'tour' && (
            <>
              <p className="mb-0">{step.tab.kurzbeschreibung}</p>
              <ul className="mb-0">
                {step.tab.punkte.map(punkt => (
                  <li key={punkt}>{punkt}</li>
                ))}
              </ul>
            </>
          )}

          {step.art === 'abschluss' && (
            <>
              <p className="mb-0">
                Die Ersteinrichtung ist abgeschlossen. Über die Hilfe im Start-Tab kannst du sie jederzeit erneut
                öffnen.
              </p>
            </>
          )}
        </div>
      )}

      {!minimiert && (
        <div className="d-flex gap-2 py-2 px-3 bg-body-secondary border-top">
          <DBButton
            type="button"
            variant="filled"
            size="small"
            disabled={isFirst}
            onClick={() => setStepIndex(index => index - 1)}
          >
            Zurück
          </DBButton>
          <DBButton type="button" className="me-auto" variant="ghost" size="small" onClick={onClose}>
            Überspringen
          </DBButton>
          {isLast ? (
            <DBButton type="button" variant="brand" size="small" onClick={onClose}>
              Fertig
            </DBButton>
          ) : (
            <DBButton type="button" variant="brand" size="small" disabled={!weiterErlaubt} onClick={weiter}>
              {weiterText}
            </DBButton>
          )}
        </div>
      )}
    </DBCard>
  );
};

export default OnboardingGuidePanel;
