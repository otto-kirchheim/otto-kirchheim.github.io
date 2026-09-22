import type { FeatureParts } from '@/shared/lib/feature';

/** Hilfetexte des Features EWT: Tab-Hilfe und Hilfe der Dialoge (Schluessel wie `meta.helpKeys`). */
const help: FeatureParts['help'] = {
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
    tipp: 'EWT kann als Hilfe für die Erschwerniszulagen dienen, ist dafür aber kein Muss.',
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
};

export default help;
