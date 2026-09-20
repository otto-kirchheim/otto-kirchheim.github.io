import type { FeatureParts } from '@/core/hooks';

/** Hilfetexte des Features EA: Tab-Hilfe und Hilfe der Dialoge (Schluessel wie `meta.helpKeys`). */
const help: FeatureParts['help'] = {
  'tab.ea': {
    title: 'Entgeltausgleich',
    kurzbeschreibung: 'Erfassung geleisteter höherwertiger Tätigkeit je Kalendertag im gewählten Monat (§6 FGrTV).',
    wasKannIchHierMachen: ['Entgeltausgleich zu einem Tag hinzufügen', 'Erfasste Einträge speichern'],
    buttons: [
      { label: 'Hinzufügen', description: 'Neuen Entgeltausgleich-Eintrag für einen Tag anlegen' },
      { label: 'Speichern', description: 'Erfasste Einträge dauerhaft sichern' },
      { label: 'PDF erzeugen', description: 'Monatsübersicht als PDF exportieren' },
    ],
    eingaberegeln: [
      'Pro Kalendertag nur ein Eintrag.',
      'Bei Zuordnung zu einem EWT-Eintrag wird die Dauer automatisch aus dessen Arbeitszeit abzüglich der gesetzlichen Pause berechnet.',
      'Ohne EWT-Zuordnung ist die Dauer frei im Format HH:mm einzutragen.',
    ],
    haeufigeFehler: ['Ein zweiter Eintrag am selben Kalendertag wird mit einem Hinweis markiert.'],
    tipp: 'Entgeltausgleich fließt als reine Stundenübersicht in die Berechnung ein, nicht als Geldbetrag.',
  },
  'modal.eaEintrag.add': {
    title: 'Entgeltausgleich hinzufügen',
    kurzbeschreibung: 'Legt einen Entgeltausgleich-Eintrag mit frei wählbarem Datum an.',
    wasKannIchHierMachen: ['Tag, Dauer, Tätigkeit und Entgeltgruppe eintragen', 'Optional einem EWT-Eintrag zuordnen'],
    felder: [
      { label: 'Tag', description: 'Kalendertag; pro Tag ist nur ein Eintrag vorgesehen.' },
      {
        label: 'EWT-Eintrag (optional)',
        description: 'Bei Auswahl werden Tag sowie Dauer automatisch aus der Arbeitszeit berechnet und gesperrt.',
      },
      { label: 'Dauer', description: 'Geleistete höherwertige Arbeitszeit (HH:mm), falls nicht aus EWT berechnet.' },
      { label: 'Tätigkeit', description: 'Welche höherwertige Tätigkeit an diesem Tag ausgeübt wurde.' },
      { label: 'Entgeltgruppe', description: 'Entgeltgruppe der ausgeübten Tätigkeit.' },
    ],
    haeufigeFehler: ['Für den gewählten Tag existiert bereits ein Eintrag.'],
    tipp: 'Ohne EWT-Zuordnung Dauer manuell eintragen.',
  },
  'modal.eaEintrag.edit': {
    title: 'Entgeltausgleich bearbeiten',
    kurzbeschreibung: 'Ändert Dauer, EWT-Zuordnung, Tätigkeit oder Entgeltgruppe eines bestehenden Eintrags.',
    wasKannIchHierMachen: ['Dauer/EWT-Zuordnung anpassen', 'Tätigkeit und Entgeltgruppe korrigieren'],
    felder: [
      {
        label: 'EWT-Eintrag (optional)',
        description: 'Bei Auswahl wird die Dauer automatisch aus der Arbeitszeit berechnet und gesperrt.',
      },
      { label: 'Tätigkeit', description: 'Welche höherwertige Tätigkeit an diesem Tag ausgeübt wurde.' },
      { label: 'Entgeltgruppe', description: 'Entgeltgruppe der ausgeübten Tätigkeit.' },
    ],
    haeufigeFehler: ['Für den geänderten Tag existiert bereits ein anderer Eintrag.'],
    tipp: 'EWT-Zuordnung entfernen, um die Dauer wieder frei editierbar zu machen.',
  },
};

export default help;
