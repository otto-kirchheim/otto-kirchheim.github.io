import { featureRegistry } from '@/shared/lib/feature';

/** Hilfe-Kontexte der globalen Bereiche; die Kontexte der Features stehen in `meta.helpKeys` und im lazy Teil `help`. */
type CoreHelpKey = 'tab.start' | 'tab.einstellungen' | 'tab.berechnung';

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
    kurzbeschreibung:
      'Persönliche Daten, Sicherheit, Arbeitszeit sowie die Abschnitte der aktiven Bereiche (z. B. Bereitschaft, Fahrzeiten, Zulagen); dazu sichtbare Bereiche, AutoSave und der Jahreswechsel.',
    wasKannIchHierMachen: [
      'Persönliche Daten pflegen und E-Mail-Verifizierung anstoßen',
      'Biometrie (Passkey) einrichten oder Passwort ändern',
      'Arbeitszeit, Fahrzeiten und weitere Abschnitte der aktiven Bereiche prüfen',
      'Sichtbare Bereiche und AutoSave konfigurieren',
      'Jahr wechseln',
      'Einstellungen speichern',
    ],
    buttons: [
      { label: 'Auswählen', description: 'Wechselt zum eingegebenen Jahr (lädt dessen Daten)' },
      { label: 'Speichern', description: 'Sichert alle Abschnitte dauerhaft' },
      { label: 'Biometrie einrichten', description: 'Richtet einen Passkey für den passwortlosen Login ein' },
      { label: 'Passwort Ändern', description: 'Öffnet den Dialog zum Ändern des Passworts (Abschnitt "Sicherheit")' },
    ],
    haeufigeFehler: [
      'Offene E-Mail-Verifizierung wird übersehen, wodurch System-Mails nicht zuverlässig ankommen.',
      'Ein Bereich wird abgewählt, ohne vorher zu speichern – ungesicherte Änderungen im zugehörigen Abschnitt gehen sonst verloren.',
    ],
    tipp: 'Ein eingerichteter Passkey ist optional und ersetzt die Passworteingabe beim nächsten Login. Ausloggen liegt in der Kopfzeile, nicht in diesem Tab.',
  },
  'tab.berechnung': {
    title: 'Berechnung',
    kurzbeschreibung: 'Monatsübersicht der berechneten Werte aller aktiven Bereiche für das gewählte Jahr.',
    wasKannIchHierMachen: [
      'Berechnete Beträge und Zeiten je Monat und Bereich einsehen',
      'Zwischen Monatsfenstern blättern',
      'Monatswerte vergleichen',
    ],
    buttons: [
      { label: 'Frühere Monate anzeigen', description: 'Blättert das Monatsfenster nach vorn' },
      { label: 'Spätere Monate anzeigen', description: 'Blättert das Monatsfenster nach hinten' },
    ],
    haeufigeFehler: [
      'Ein deaktivierter oder noch leerer Bereich zeigt in seiner Spalte keine Werte, das ist kein Fehler.',
    ],
    tipp: 'Auf kleinen Bildschirmen erscheinen die Monate als Karten statt als Tabelle.',
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
