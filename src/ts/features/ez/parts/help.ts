import type { FeatureParts } from '@/shared/lib/feature';

/** Hilfetexte des Features Erschwerniszulagen (Neben): Tab-Hilfe und Hilfe der Dialoge (Schluessel wie `meta.helpKeys`). */
const help: FeatureParts['help'] = {
  'tab.neben': {
    title: 'Erschwerniszulagen',
    kurzbeschreibung: 'Erfassung von Erschwerniszulagen je Kalendertag im gewählten Monat.',
    wasKannIchHierMachen: ['Erschwerniszulagen zu einem Tag hinzufügen', 'Erfasste Erschwerniszulagen speichern'],
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
};

export default help;
