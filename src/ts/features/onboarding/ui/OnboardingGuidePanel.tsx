import { DBButton, DBCard, DBHeadingH6, DBInfotext, DBTooltip } from '@db-ux/react-core-components';
import { type FC, useEffect, useMemo, useState } from 'react';

// Direktimporte statt Barrel (@/core, @/components), um den Zyklus createOnboardingGuideModal →
// OnboardingGuidePanel → openHelpModal → MyHelpModal → createOnboardingGuideModal zu vermeiden.
import { onEvent } from '@/shared/lib/events/appEvents';
import { featureRegistry } from '@/shared/lib/feature';
import { getHelpContent } from '@/shared/lib/help/helpContent';
import { ladeEinstellungenTeile } from '@/infrastructure/ui/einstellungenTeile';
import { capturePersSnapshot, springeZu, validatePersoenlicheDaten } from '../model/onboardingValidation';

/** Eintrag der Tab-Tour: Tab-Knopf (Selektor), Titel, Kurzbeschreibung und Stichpunkte. */
export type TourTab = { tabButtonId: string; titel: string; kurzbeschreibung: string; punkte: string[] };

/** Schritt der Ersteinrichtung, unterschieden nach `art`. */
type BestaetigungSchritt = { art: 'bestaetigung'; id: string; titel: string; beschreibung: string; collapseId: string };

type GuideStep =
  { art: 'intro' } | { art: 'pers' } | BestaetigungSchritt | { art: 'tour'; tab: TourTab } | { art: 'abschluss' };

/** Feature-abhängiger Teil der Ersteinrichtung, asynchron aus den lazy Feature-Teilen `help` und `einstellungen` geladen. */
type FeatureInhalt = { tourTabs: TourTab[]; pruefSchritte: BestaetigungSchritt[] };

/**
 * Prüft, ob der Tab-Knopf sichtbar ist (sein `<li>` ist nicht per `d-none` ausgeblendet).
 *
 * @param tabButtonId - CSS-Selektor des Tab-Knopfs, z. B. `#ewt-tab`.
 * @returns `false`, wenn der Knopf fehlt oder ausgeblendet ist.
 */
function istTabSichtbar(tabButtonId: string): boolean {
  const button = document.querySelector<HTMLButtonElement>(tabButtonId);
  if (!button) return false;
  return !button.closest('li')?.classList.contains('d-none');
}

/**
 * Baut die Tour-Einträge für alle sichtbaren Feature-Tabs (Hilfetexte) und Berechnung. Ein Feature, dessen Hilfe nicht
 * geladen werden kann, fehlt in der Tour.
 *
 * @returns Tour-Tabs in Feature-Reihenfolge (`meta.order`), danach Berechnung.
 */
async function getTourTabs(): Promise<TourTab[]> {
  const tabs: TourTab[] = [];

  for (const meta of featureRegistry.metas()) {
    const tabButtonId = `#${meta.legacy.navId}`;
    if (!istTabSichtbar(tabButtonId)) continue;
    const content = await getHelpContent(`tab.${meta.legacy.tabKey}`).catch((error: unknown) => {
      console.error(`Hilfe von '${meta.id}' konnte nicht geladen werden:`, error);
      return undefined;
    });
    if (!content) continue;
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

/**
 * Baut die Prüf-Schritte der Feature-Abschnitte in den Einstellungen (`section.onboarding`), nach `order` der Abschnitte.
 * Ein Feature, dessen Tab ausgeblendet ist (in den Einstellungen deaktiviert), hat auch keinen Prüf-Schritt: sein Abschnitt ist versteckt.
 *
 * @returns Schritte; leer, wenn kein sichtbares Feature einen Prüf-Schritt anmeldet.
 */
async function getPruefSchritte(): Promise<BestaetigungSchritt[]> {
  const teile = await ladeEinstellungenTeile();
  return teile
    .filter(teil => {
      const navId = featureRegistry.meta(teil.id)?.legacy.navId;
      return navId === undefined || istTabSichtbar(`#${navId}`);
    })
    .flatMap(teil => teil.part.sections)
    .sort((a, b) => a.order - b.order)
    .flatMap(({ id, onboarding }) =>
      onboarding ? [{ art: 'bestaetigung' as const, id, ...onboarding, collapseId: `#${id}` }] : [],
    );
}

/**
 * Liefert die Überschrift eines Schritts.
 *
 * @param step - Aktueller Schritt.
 * @returns Titeltext.
 */
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

/**
 * Schwebendes Panel der Ersteinrichtung: führt schrittweise durch persönliche Daten,
 * Einstellungs-Abschnitte und Tabs; springt dabei zum jeweiligen Bereich. Weiter ist im
 * Schritt "pers" erst bei vollständigen Pflichtangaben möglich.
 *
 * @param props - `captureSnapshot` (Snapshot der Template-Werte anlegen) und `onClose`.
 */
const OnboardingGuidePanel: FC<{ captureSnapshot: boolean; onClose: () => void }> = ({ captureSnapshot, onClose }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [minimiert, setMinimiert] = useState(false);
  const [, setVersion] = useState(0);
  /** Erzwingt ein Neurendern, damit die Pflichtfeld-Prüfung den Formularstand neu liest. */
  const refresh = () => setVersion(version => version + 1);

  useEffect(() => onEvent('data:changed', refresh), []);
  useEffect(() => {
    /** Erzwingt bei jeder Eingabe im Dokument ein Neurendern (Pflichtfeld-Prüfung liest den Formularstand). */
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

  const [inhalt, setInhalt] = useState<FeatureInhalt>({ tourTabs: [], pruefSchritte: [] });
  useEffect(() => {
    let aktiv = true;
    void Promise.all([getTourTabs(), getPruefSchritte()]).then(([tourTabs, pruefSchritte]) => {
      if (aktiv) setInhalt({ tourTabs, pruefSchritte });
    });
    return () => {
      aktiv = false;
    };
  }, []);
  const { tourTabs, pruefSchritte } = inhalt;

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
      ...pruefSchritte,
      ...tourTabs.map(tab => ({ art: 'tour', tab }) as const),
      { art: 'abschluss' },
    ],
    [tourTabs, pruefSchritte],
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

    // Das Intro bleibt auf dem Start-Tab; erst der nächste Schritt ("pers") wechselt in die Einstellungen.
    if (step.art === 'intro') {
      springeZu('#brand-start-tab');
      return;
    }

    const collapseId = step.art === 'pers' ? '#collapseOne' : step.art === 'bestaetigung' ? step.collapseId : null;
    if (!collapseId) return;

    springeZu('#einstellungen-tab', collapseId);
    const accordionItem = document.querySelector(collapseId)?.closest('.db-accordion-item');
    accordionItem?.classList.add('onboarding-focus');
    return () => accordionItem?.classList.remove('onboarding-focus');
  }, [step]);

  const weiterErlaubt = step.art === 'pers' ? persValidation.ok : true;
  const weiterText = 'Weiter';
  /** Geht zum nächsten Schritt; nach dem letzten Tour-Tab zurück auf den Start-Tab. */
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
          <DBHeadingH6 className="mb-0">{titel}</DBHeadingH6>

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
