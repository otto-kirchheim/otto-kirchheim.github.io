import type { FeatureParts } from '@/core/hooks';

/** Hilfetexte des Features Bereitschaft: Tab-Hilfe und Hilfe der Dialoge (Schluessel wie `meta.helpKeys`). */
const help: FeatureParts['help'] = {
  'tab.bereitschaft': {
    title: 'Bereitschaft',
    kurzbeschreibung: 'Erfassung von Bereitschaftszeiten und Bereitschaftseinsätzen für den gewählten Monat.',
    wasKannIchHierMachen: ['Bereitschaftszeiten erfassen', 'Einsätze innerhalb einer Bereitschaft erfassen'],
    buttons: [
      { label: 'Bereitschaft hinzufügen', description: 'Neuen Bereitschaftszeitraum anlegen' },
      { label: 'Einsatz hinzufügen', description: 'Einen Einsatz zu einem bestehenden Bereitschaftszeitraum erfassen' },
      { label: 'Speichern', description: 'Erfasste Zeilen dauerhaft sichern' },
      { label: 'PDF erzeugen', description: 'Monatsübersicht als PDF exportieren' },
    ],
    schritte: ['Erfassen', 'Prüfen', 'Speichern', 'Export'],
    eingaberegeln: [
      'Zeitraumwechsel an Wochenenden/Feiertagen spätestens um 08:00 Uhr.',
      'Bereitschaftszeiträume dürfen sich nicht überschneiden.',
      'Jeder Einsatz muss vollständig in einem Bereitschaftszeitraum liegen.',
      'Pro Bereitschaftszeitraum nur ein LRE 1; bei weniger als 10 Minuten Abstand „LRE 1/2 ohne x" verwenden.',
    ],
    haeufigeFehler: ['Ein Einsatz passt nicht zu einem vorhandenen Bereitschaftszeitraum.'],
  },
  'modal.bereitschaft.add': {
    title: 'Bereitschaft hinzufügen',
    kurzbeschreibung:
      'Wählt eine Wochenvorlage und legt daraus einen kompletten Bereitschaftszeitraum inkl. optionaler Zusatzschichten an.',
    wasKannIchHierMachen: ['Passende Vorlage wählen', 'Bei Bedarf Datum/Zeiten oder Zusatzschichten anpassen'],
    felder: [
      {
        label: 'Auswahl Bereitschaft',
        description: 'Vorlage wählen – bestimmt Wochentage und Standard-Zeiten automatisch.',
      },
      {
        label: 'Anfang / Ende',
        description:
          'Werden aus der Vorlage berechnet. Nur über „Datum & Zeiten manuell anpassen" von Hand ändern, z. B. bei stundenweiser Übernahme.',
      },
      {
        label: 'Spät- / Sonderschicht',
        description:
          'Nur aktivieren, wenn dieser Zeitraum die Schicht tatsächlich enthält – dann erscheinen eigene Von/Bis-Felder.',
      },
      {
        label: 'Nachtschicht',
        description: 'Aktivieren, wenn der Zeitraum über Mitternacht geht. Die Zeiten folgen der Arbeitszeit Nacht.',
      },
    ],
    haeufigeFehler: [
      'Es wird eine Vorlage ohne Nachtschicht gewählt, obwohl der Zeitraum eigentlich über Mitternacht geht.',
    ],
    tipp: 'Abweichende persönliche Arbeitszeiten über „Andere Arbeitszeiten hinterlegen" eintragen, statt die berechneten Felder zu überschreiben.',
  },
  'modal.bereitschaftEintrag.add': {
    title: 'Bereitschaftszeitraum hinzufügen',
    kurzbeschreibung: 'Legt einen einzelnen Bereitschaftszeitraum mit Beginn, Ende und Pause an.',
    wasKannIchHierMachen: ['Beginn und Ende als Datum + Uhrzeit eintragen', 'Pause in Minuten angeben'],
    felder: [
      { label: 'Beginn / Ende', description: 'Datum und Uhrzeit; Ende muss nach Beginn liegen.' },
      { label: 'Pause', description: 'Pause in Minuten (0–60).' },
    ],
    haeufigeFehler: [
      'Ende liegt nicht nach Beginn.',
      'Der Zeitraum überschneidet sich mit einem bestehenden Bereitschaftszeitraum.',
    ],
    tipp: 'Für eine ganze Woche mit mehreren Zeiträumen aus einer Vorlage die Aktion „Bereitschaft" oben im Tab nutzen statt einzelne Zeiträume hier anzulegen.',
  },
  'modal.bereitschaftEintrag.edit': {
    title: 'Bereitschaftszeitraum bearbeiten',
    kurzbeschreibung: 'Ändert Beginn, Ende oder Pause eines bestehenden Bereitschaftszeitraums.',
    wasKannIchHierMachen: ['Beginn/Ende anpassen', 'Pause korrigieren'],
    felder: [
      { label: 'Beginn / Ende', description: 'Datum und Uhrzeit; Ende muss nach Beginn liegen.' },
      { label: 'Pause', description: 'Pause in Minuten (0–60).' },
    ],
    haeufigeFehler: [
      'Ende liegt nicht nach Beginn.',
      'Der Zeitraum überschneidet sich mit einem bestehenden Bereitschaftszeitraum.',
    ],
    tipp: 'Änderungen wirken sich auf bereits erfasste Einsätze in diesem Zeitraum aus.',
  },
  'modal.bereitschaftEinsatz.add': {
    title: 'Einsatz hinzufügen',
    kurzbeschreibung: 'Schnelleingabe für einen einzelnen Bereitschaftseinsatz.',
    wasKannIchHierMachen: [
      'Datum, Zeiten und LRE eintragen',
      'Bei fehlendem Zeitraum automatisch einen Bereitschaftszeitraum miterzeugen lassen',
    ],
    felder: [
      { label: 'Datum', description: 'Tag des Einsatzes innerhalb des gewählten Monats.' },
      { label: 'SAP-Nr / Einsatzbeschreibung', description: 'Kurze Beschreibung oder SAP-Nummer des Einsatzes.' },
      { label: 'Von / Bis', description: 'Uhrzeit des Einsatzes; Bis muss von Von abweichen.' },
      {
        label: 'LRE',
        description:
          'Passende Kategorie wählen (LRE 1/2/3, ggf. „ohne x" bei zu knappem Zeitabstand zum vorherigen LRE 1/2).',
      },
      {
        label: 'Km Privatfahrzeug',
        description:
          'Nur ausfüllen, wenn tatsächlich mit privatem Fahrzeug gefahren wurde und kein Dienstwagen zur Verfügung stand.',
      },
      {
        label: '„Bereitschaftszeitraum für diesen Einsatz anlegen?"',
        description:
          'Aktivieren, wenn für diesen Einsatz noch kein passender Bereitschaftszeitraum existiert – er wird dann automatisch mit angelegt bzw. erweitert.',
      },
    ],
    haeufigeFehler: [
      'Der Einsatz passt zeitlich nicht zu einem vorhandenen Bereitschaftszeitraum und die Checkbox „Bereitschaftszeitraum anlegen?" wurde nicht aktiviert.',
      'Zwei Einsätze überschneiden sich zeitlich.',
      'Pro Bereitschaftszeitraum ist nur ein LRE 1 zulässig – für einen weiteren Einsatz LRE 2 oder LRE 3 wählen.',
      'Zwischen zwei LRE 1/LRE 2 liegen weniger als 10 Minuten – dann „LRE 1/2 ohne x" verwenden.',
    ],
    tipp: 'Ohne aktivierte Checkbox muss vorher ein passender Bereitschaftszeitraum existieren, sonst schlägt das Speichern fehl.',
  },
  'modal.bereitschaftEinsatzEintrag.add': {
    title: 'Einsatz hinzufügen',
    kurzbeschreibung: 'Legt einen einzelnen Bereitschaftseinsatz über die Tabelle an.',
    wasKannIchHierMachen: ['Datum, Zeiten und LRE eintragen', 'Bei Bedarf privat gefahrene Kilometer angeben'],
    felder: [
      { label: 'Datum', description: 'Tag des Einsatzes innerhalb des gewählten Monats.' },
      { label: 'SAP-Nr / Einsatzbeschreibung', description: 'Kurze Beschreibung oder SAP-Nummer des Einsatzes.' },
      { label: 'Von / Bis', description: 'Uhrzeit des Einsatzes.' },
      { label: 'LRE', description: 'Passende Kategorie wählen (LRE 1/2/3, ggf. „ohne x").' },
      {
        label: 'Km Privatfahrzeug',
        description:
          'Nur ausfüllen, wenn tatsächlich mit privatem Fahrzeug gefahren wurde und kein Dienstwagen zur Verfügung stand.',
      },
    ],
    haeufigeFehler: [
      'Der Einsatz passt zeitlich nicht zu einem vorhandenen Bereitschaftszeitraum (wird hier nur als Warnung angezeigt, nicht automatisch angelegt).',
      'Zwei Einsätze überschneiden sich zeitlich.',
      'Pro Bereitschaftszeitraum ist nur ein LRE 1 zulässig.',
      'Zwischen zwei LRE 1/LRE 2 liegen weniger als 10 Minuten – dann „LRE 1/2 ohne x" verwenden.',
    ],
    tipp: 'Fehlt ein passender Zeitraum, vorher im Bereitschafts-Tab einen anlegen oder das Schnelleingabe-Fenster „Einsatz" mit der Option „Bereitschaftszeitraum anlegen" nutzen.',
  },
  'modal.bereitschaftEinsatzEintrag.edit': {
    title: 'Einsatz bearbeiten',
    kurzbeschreibung: 'Ändert Zeiten, LRE oder Kilometerangabe eines bestehenden Einsatzes.',
    wasKannIchHierMachen: ['Zeiten anpassen', 'LRE-Angabe korrigieren'],
    felder: [
      { label: 'Von / Bis', description: 'Uhrzeit des Einsatzes.' },
      { label: 'LRE', description: 'Passende Kategorie wählen (LRE 1/2/3, ggf. „ohne x").' },
    ],
    haeufigeFehler: [
      'Der Einsatz passt zeitlich nicht zu einem vorhandenen Bereitschaftszeitraum.',
      'Zwei Einsätze überschneiden sich zeitlich.',
      'Pro Bereitschaftszeitraum ist nur ein LRE 1 zulässig.',
      'Zwischen zwei LRE 1/LRE 2 liegen weniger als 10 Minuten – dann „LRE 1/2 ohne x" verwenden.',
    ],
    tipp: 'LRE1/LRE2 nur setzen, wenn es zum Einsatzfall passt.',
  },
  'modal.einstellungen.ve': {
    title: 'Arbeitszeitvorgabe',
    kurzbeschreibung: 'Pflegt Name, Bereitschaftszeitraum und Schichten-Zuordnung einer Arbeitszeitvorgabe.',
    wasKannIchHierMachen: [
      'Name und Standard-Kennzeichnung pflegen',
      'Bereitschafts-Zeitraum (Beginn/Ende) festlegen',
      'Schichten (Früh/Spät/Nacht/Sonder) zuordnen',
    ],
    felder: [
      { label: 'Name', description: 'Bezeichnung zur Wiedererkennung in der Auswahl.' },
      {
        label: 'Standard',
        description: 'Legt fest, welche Vorgabe beim Anlegen einer neuen Bereitschaft vorausgewählt ist.',
      },
      { label: 'Beginn / Ende', description: 'Wochentag und Uhrzeit, ab wann die Bereitschaft läuft.' },
      {
        label: 'Schichten',
        description: 'Früh/Spät/Nacht/Sonder zuordnen; Nacht-Schichten benötigen einen eigenen Beginn/Ende-Zeitraum.',
      },
    ],
    haeufigeFehler: [
      'Eine neue Vorlage wird versehentlich als Standard markiert und ersetzt dadurch die bisherige Standard-Vorgabe.',
    ],
    tipp: 'Nacht-Schichten benötigen einen eigenen Beginn/Ende-Zeitraum.',
  },
};

export default help;
