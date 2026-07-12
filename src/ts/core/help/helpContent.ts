export type HelpContextKey =
  | 'tab.start'
  | 'tab.bereitschaft'
  | 'tab.ewt'
  | 'tab.neben'
  | 'tab.einstellungen'
  | 'modal.bereitschaft.add'
  | 'modal.bereitschaftEintrag.add'
  | 'modal.bereitschaftEintrag.edit'
  | 'modal.bereitschaftEinsatz.add'
  | 'modal.bereitschaftEinsatzEintrag.add'
  | 'modal.bereitschaftEinsatzEintrag.edit'
  | 'modal.ewt.add'
  | 'modal.ewtEintrag.add'
  | 'modal.ewtEintrag.edit'
  | 'modal.neben.add'
  | 'modal.nebenEintrag.add'
  | 'modal.nebenEintrag.edit'
  | 'modal.einstellungen.ve';

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

const HELP_CONTENT: Record<HelpContextKey, HelpContent> = {
  'tab.start': {
    title: 'Start',
    kurzbeschreibung: 'Einstiegspunkt mit Übersicht und Zugriff auf die Ersteinrichtung.',
    wasKannIchHierMachen: [
      'Überblick über die empfohlene Reihenfolge erhalten',
      'Ersteinrichtungs-Guide erneut öffnen',
    ],
    schritte: ['Einstellungen prüfen', 'Monat erfassen', 'Speichern', 'PDF exportieren'],
    haeufigeFehler: ['Ersteinrichtung wird übersprungen, wodurch Einstellungen und Verifizierung ungeprüft bleiben.'],
    tipp: 'Die Ersteinrichtung lässt sich hier jederzeit erneut öffnen, falls du sie nochmal durchgehen möchtest.',
    reopenOnboardingAction: true,
  },
  'tab.bereitschaft': {
    title: 'Bereitschaft',
    kurzbeschreibung: 'Erfassung von Bereitschaftszeiten und Bereitschaftseinsätzen für den gewählten Monat.',
    wasKannIchHierMachen: ['Bereitschaftszeiten erfassen', 'Einsätze innerhalb einer Bereitschaft erfassen'],
    buttons: [
      { label: 'Bereitschaft hinzufügen', description: 'Neuen Bereitschaftszeitraum anlegen' },
      { label: 'Einsatz hinzufügen', description: 'Einen Einsatz zu einem bestehenden Bereitschaftszeitraum erfassen' },
      { label: 'Speichern', description: 'Erfasste Zeilen dauerhaft sichern' },
      { label: 'Herunterladen PDF', description: 'Monatsübersicht als PDF exportieren' },
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
  'tab.ewt': {
    title: 'EWT',
    kurzbeschreibung: 'Einsatzwechseltätigkeit: Fahrzeiten berechnen und Anwesenheiten speichern.',
    wasKannIchHierMachen: ['Anwesenheiten erfassen', 'Fahrzeiten berechnen lassen', 'Berechnete Zeilen zurücksetzen'],
    buttons: [
      { label: 'Berechnen', description: 'Fahrzeiten aus den erfassten Daten ermitteln, ohne zu speichern' },
      { label: 'Speichern', description: 'Erfasste und berechnete Zeilen dauerhaft sichern' },
      { label: 'Alle Zeiten entfernen', description: 'Setzt alle berechneten Zeilen im Monat zurück' },
    ],
    eingaberegeln: [
      'Die acht Zeitpunkte eines Tages müssen chronologisch aufeinander folgen.',
      'Tage dürfen sich nicht mit dem Zeitfenster eines anderen Tages überschneiden.',
      'Der Buchungstag kann vom Arbeitstag abweichen (z. B. bei Nachtschicht).',
    ],
    haeufigeFehler: [
      '"Alle Zeiten entfernen" löscht auch bereits berechnete Zeilen unwiderruflich für den Monat.',
      'Nach Änderungen wird „Berechnen" nicht erneut ausgeführt, wodurch veraltete Fahrzeiten gespeichert werden.',
    ],
    tipp: 'EWT kann als Hilfe für die Nebenbezüge dienen, ist dafür aber kein Muss.',
  },
  'tab.neben': {
    title: 'Nebenbezüge',
    kurzbeschreibung: 'Erfassung von Nebenbezügen je Kalendertag im gewählten Monat.',
    wasKannIchHierMachen: ['Nebenbezüge zu einem Tag hinzufügen', 'Erfasste Nebenbezüge speichern'],
    buttons: [
      { label: 'Hinzufügen', description: 'Neuen Nebenbezugs-Eintrag für einen Tag anlegen' },
      { label: 'Speichern', description: 'Erfasste Einträge dauerhaft sichern' },
    ],
    eingaberegeln: [
      'Pro Kalendertag nur ein Eintrag.',
      'Auftragsnummer muss genau 9-stellig sein.',
      'Für die Schnellauswahl muss der Tag vorher in EWT erfasst und berechnet sein.',
    ],
    haeufigeFehler: [
      'Ein zweiter Eintrag am selben Kalendertag wird mit einem Hinweis markiert.',
      'Der gewünschte Tag fehlt in der Schnellauswahl, weil er in EWT noch nicht erfasst und berechnet wurde.',
    ],
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
  'modal.ewt.add': {
    title: 'Anwesenheit hinzufügen',
    kurzbeschreibung: 'Schnelleingabe für aufeinanderfolgende Tage; Fahrzeiten werden automatisch berechnet.',
    wasKannIchHierMachen: [
      'Tag, Einsatzort und Schicht eintragen',
      'Mit „+1 Tag" zügig mehrere Tage hintereinander erfassen',
    ],
    felder: [
      { label: 'Tag', description: 'Datum der Anwesenheit; „+1 Tag" springt automatisch zum nächsten Tag.' },
      { label: 'Einsatzort', description: 'Einsatzort aus der Liste wählen.' },
      { label: 'Schicht', description: 'Früh/Spät/Nacht/Sonder wählen – bestimmt die automatisch berechneten Zeiten.' },
      {
        label: 'Berechnen',
        description: 'Aktiv lassen, damit die Fahrzeiten automatisch aus Einsatzort/Schicht berechnet werden.',
      },
      {
        label: 'Büro',
        description:
          'Aktivieren, wenn keine Fahrt zu einem Einsatzort stattfand – sperrt Einsatzort/Schicht und leert die Zwischenzeiten.',
      },
    ],
    haeufigeFehler: [
      'Der automatisch berechnete Buchungstag weicht vom eingegebenen Tag ab (z. B. bei Nachtschicht) und wird leicht übersehen.',
    ],
    tipp: 'Nach dem Speichern bleibt dieses Fenster offen und springt automatisch zum nächsten Tag – ideal für mehrere Tage hintereinander. Einzelne Zeitfelder lassen sich nur im Tabellen-Editor manuell anpassen.',
  },
  'modal.ewtEintrag.add': {
    title: 'Anwesenheit hinzufügen',
    kurzbeschreibung: 'Vollständiger Editor mit allen Fahrzeiten manuell editierbar.',
    wasKannIchHierMachen: ['Tag, Einsatzort und Schicht eintragen', 'Alle Fahrzeiten einzeln von Hand setzen'],
    felder: [
      { label: 'Tag', description: 'Datum der Anwesenheit.' },
      { label: 'Einsatzort / Schicht', description: 'Bestimmen die vorgeschlagenen Zeiten.' },
      {
        label: 'Wohnung ab/an, Beginn/Ende, 1. Tätigkeitsstätte ab/an, Einsatzort an/ab',
        description: 'Alle acht Zeitpunkte des Tages einzeln erfassen; sie müssen chronologisch aufeinander folgen.',
      },
    ],
    haeufigeFehler: [
      'Die acht Zeitfelder sind nicht chronologisch aufeinanderfolgend erfasst.',
      'Der Tag überschneidet sich mit einem bereits erfassten Zeitfenster eines anderen Tages.',
    ],
    tipp: 'Für die schnelle Erfassung mehrerer Tage eignet sich die Aktion „Anwesenheit" oben im Tab besser als dieser Editor.',
  },
  'modal.ewtEintrag.edit': {
    title: 'Anwesenheit bearbeiten',
    kurzbeschreibung: 'Ändert Einsatzort, Schicht oder einzelne Fahrzeiten einer bestehenden Anwesenheit.',
    wasKannIchHierMachen: ['Einsatzort/Schicht anpassen', 'Einzelne Zeiten korrigieren oder alle Zeiten zurücksetzen'],
    felder: [
      { label: 'Einsatzort / Schicht', description: 'Bestimmen die vorgeschlagenen Zeiten.' },
      { label: 'Zeiten löschen', description: 'Setzt alle acht Zeitfelder dieser Zeile auf leer zurück.' },
    ],
    haeufigeFehler: [
      'Die acht Zeitfelder sind nicht chronologisch aufeinanderfolgend erfasst.',
      'Der Tag überschneidet sich mit einem bereits erfassten Zeitfenster eines anderen Tages.',
    ],
    tipp: 'Der Buchungstag kann vom Tag abweichen, z. B. bei Nachtschicht über Mitternacht.',
  },
  'modal.neben.add': {
    title: 'Nebenbezug hinzufügen',
    kurzbeschreibung: 'Schnellauswahl eines bereits in EWT erfassten Tages.',
    wasKannIchHierMachen: ['Tag aus der Liste der EWT-Tage wählen', 'Auftragsnummer und Zulagen eintragen'],
    felder: [
      {
        label: 'Tag (aus EWT)',
        description: 'Nur bereits in EWT erfasste Tage stehen zur Auswahl; Tage mit vorhandenem Eintrag sind gesperrt.',
      },
      { label: 'Auftragsnummer', description: 'Muss genau 9-stellig sein.' },
      { label: 'Zulagen', description: 'Anzahl je Zulagen-Code eintragen; 0 bedeutet „nicht zutreffend".' },
    ],
    haeufigeFehler: ['Auftragsnummer hat nicht genau 9 Stellen.'],
    tipp: 'Steht der gewünschte Tag nicht zur Auswahl, über den Footer-Button „Manuell" direkt einen Eintrag mit freiem Datum anlegen.',
  },
  'modal.nebenEintrag.add': {
    title: 'Nebenbezug hinzufügen',
    kurzbeschreibung: 'Legt einen Nebenbezug mit frei wählbarem Datum und Zeiten an.',
    wasKannIchHierMachen: ['Tag, Zeiten, Auftragsnummer und Zulagen eintragen', 'Optional einem EWT-Eintrag zuordnen'],
    felder: [
      { label: 'Tag', description: 'Kalendertag; pro Tag ist nur ein Eintrag vorgesehen.' },
      {
        label: 'EWT-Eintrag (optional)',
        description: 'Bei Auswahl werden Tag sowie Beginn/Ende automatisch übernommen und gesperrt.',
      },
      { label: 'Beginn / Ende', description: 'Arbeitszeit, falls nicht aus EWT übernommen.' },
      { label: 'Auftragsnummer', description: 'Muss genau 9-stellig sein.' },
      { label: 'Zulagen', description: 'Anzahl je Zulagen-Code; 0 bedeutet „nicht zutreffend".' },
    ],
    haeufigeFehler: [
      'Auftragsnummer hat nicht genau 9 Stellen.',
      'Für den gewählten Tag existiert bereits ein Eintrag.',
    ],
    tipp: 'Ohne EWT-Zuordnung Beginn/Ende manuell eintragen.',
  },
  'modal.nebenEintrag.edit': {
    title: 'Nebenbezug bearbeiten',
    kurzbeschreibung: 'Ändert Zeiten, EWT-Zuordnung, Auftragsnummer oder Zulagen eines bestehenden Eintrags.',
    wasKannIchHierMachen: ['Zeiten/EWT-Zuordnung anpassen', 'Auftragsnummer und Zulagen korrigieren'],
    felder: [
      {
        label: 'EWT-Eintrag (optional)',
        description: 'Bei Auswahl werden Beginn/Ende automatisch übernommen und gesperrt.',
      },
      { label: 'Auftragsnummer', description: 'Muss genau 9-stellig sein.' },
      { label: 'Zulagen', description: 'Anzahl je Zulagen-Code; 0 bedeutet „nicht zutreffend".' },
    ],
    haeufigeFehler: [
      'Auftragsnummer hat nicht genau 9 Stellen.',
      'Für den geänderten Tag existiert bereits ein anderer Eintrag.',
    ],
    tipp: 'EWT-Zuordnung entfernen, um Beginn/Ende wieder frei editierbar zu machen.',
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

export function getHelpContent(key: HelpContextKey): HelpContent {
  return HELP_CONTENT[key];
}
