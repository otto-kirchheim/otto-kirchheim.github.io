import { featureRegistry } from '@/core/hooks';

/** Hilfe-Kontexte der globalen Bereiche; die Kontexte der Features stehen in `meta.helpKeys` und im lazy Teil `help`. */
type CoreHelpKey = 'tab.start' | 'tab.einstellungen';

/** Hilfe-Kontext: Kern-Schluessel oder ein Schluessel aus `meta.helpKeys` eines Features (`tab.<tabKey>`, `modal.…`). */
export type HelpContextKey = CoreHelpKey | (string & Record<never, never>);

export type HelpContent = {
  title: string;
  kurzbeschreibung: string;
  wasKannIchHierMachen: string[];
  buttons?: { label: string; description: string }[];
  felder?: { label: string; description: string }[];
  schritte?: string[];
  eingaberegeln?: string[];
  haeufigeFehler?: string[];
  tipp?: string;
  reopenOnboardingAction?: boolean;
};

const CORE_HELP_CONTENT: Record<CoreHelpKey, HelpContent> = {
  'tab.start': {
    title: 'Start',
    kurzbeschreibung: 'Einstiegspunkt mit Übersicht und Zugriff auf die Ersteinrichtung.',
    wasKannIchHierMachen: [
      'Überblick über die empfohlene Reihenfolge erhalten',
      'Ersteinrichtungs-Guide erneut öffnen',
    ],
    schritte: ['Einstellungen prüfen', 'Monat erfassen', 'Speichern', 'PDF erzeugen'],
    haeufigeFehler: ['Ersteinrichtung wird übersprungen, wodurch Einstellungen und Verifizierung ungeprüft bleiben.'],
    tipp: 'Die Ersteinrichtung lässt sich hier jederzeit erneut öffnen, falls du sie nochmal durchgehen möchtest.',
    reopenOnboardingAction: true,
  },
  'tab.einstellungen': {
    title: 'Einstellungen',
    kurzbeschreibung: 'Persönliche Daten, Arbeitszeitvorgaben und Konto-Verwaltung.',
    wasKannIchHierMachen: [
      'Passwort ändern',
      'Verifizierungsstatus der E-Mail prüfen',
      'Optional Passkey einrichten',
      'Aus dem Konto abmelden',
    ],
    buttons: [
      { label: 'Passwort ändern', description: 'Öffnet den Dialog zum Ändern des Passworts' },
      { label: 'Logout', description: 'Meldet dich aus dem aktuellen Konto ab' },
    ],
    eingaberegeln: [
      'Nacht-Schichten benötigen einen eigenen Beginn/Ende-Zeitraum.',
      'Nur eine Vorgabe kann Standard sein – eine neue Standard-Markierung ersetzt die bisherige.',
    ],
    haeufigeFehler: ['Offene E-Mail-Verifizierung wird übersehen, wodurch System-Mails nicht zuverlässig ankommen.'],
    tipp: 'Ein eingerichteter Passkey ist optional und ersetzt die Passworteingabe beim nächsten Login.',
  },
};

/**
 * Liefert den Hilfetext eines Kontexts. Kern-Kontexte kommen sofort, Feature-Kontexte aus dem lazy Teil `help` des
 * Features, das den Schluessel in `meta.helpKeys` fuehrt.
 *
 * @param key - Hilfekontext.
 * @returns Hilfetext zum Kontext; `undefined` bei unbekanntem Schluessel.
 * @throws {Error} Wenn der `help`-Teil des Features nicht geladen werden kann (Chunk-Fehler).
 */
export async function getHelpContent(key: HelpContextKey): Promise<HelpContent | undefined> {
  if (key in CORE_HELP_CONTENT) return CORE_HELP_CONTENT[key as CoreHelpKey];
  const meta = featureRegistry.metas().find(candidate => candidate.helpKeys?.includes(key));
  if (!meta) return undefined;
  return (await featureRegistry.load(meta.id, 'help'))[key];
}
