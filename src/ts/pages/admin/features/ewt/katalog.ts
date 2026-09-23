import type { FeatureKatalog } from '../../ui/FormularEditor/katalogTypen';

/** Katalog-Beitrag der EWT (Formular `ewt`): Rohfelder der Anwesenheit plus vorberechnete Werte (`ewtAbgeleiteteWerte`). */
const katalog: FeatureKatalog = {
  zeilenFelder: [
    { pfad: 'Buchungstag', label: 'Buchungstag', gruppe: 'Zeile', beispiel: i => String(2 + i).padStart(2, '0') },
    { pfad: 'Einsatzort', label: 'Einsatzort', gruppe: 'Zeile', beispiel: 'Nürnberg Rbf' },
    { pfad: 'Schicht', label: 'Schicht', gruppe: 'Zeile', beispiel: 'F' },
    { pfad: 'abWE', label: 'Abfahrt Wohnung', gruppe: 'Zeile', beispiel: '05:15' },
    { pfad: 'ab1E', label: 'Abfahrt erste Tätigkeitsstätte', gruppe: 'Zeile', beispiel: '05:45' },
    { pfad: 'anEE', label: 'Ankunft Einsatzort', gruppe: 'Zeile', beispiel: '07:00' },
    { pfad: 'beginE', label: 'Arbeitsbeginn', gruppe: 'Zeile', beispiel: '07:15' },
    { pfad: 'endeE', label: 'Arbeitsende', gruppe: 'Zeile', beispiel: '15:45' },
    { pfad: 'abEE', label: 'Abfahrt Einsatzort', gruppe: 'Zeile', beispiel: '16:00' },
    { pfad: 'an1E', label: 'Ankunft erste Tätigkeitsstätte', gruppe: 'Zeile', beispiel: '17:15' },
    { pfad: 'anWE', label: 'Ankunft Wohnung', gruppe: 'Zeile', beispiel: '17:45' },
    // Vorberechnet (`ewtAbgeleiteteWerte`), eigene Gruppe: der Editor bietet sie ohne Rechnung-Builder als
    // Spalten-/Ankreuz-Quelle an.
    { pfad: 'DauerWohnung', label: 'Dauer Wohnung (HH:mm)', gruppe: 'Berechnet', beispiel: '12:30' },
    { pfad: 'DauerErsteTkgSt', label: 'Dauer erste Tätigkeitsstätte (HH:mm)', gruppe: 'Berechnet', beispiel: '11:30' },
    { pfad: 'Wohnung8bis14', label: 'Wohnung: 8-14h', gruppe: 'Berechnet', beispiel: 'true' },
    { pfad: 'Wohnung14bis24', label: 'Wohnung: 14-24h', gruppe: 'Berechnet', beispiel: 'false' },
    { pfad: 'WohnungUeber24', label: 'Wohnung: über 24h', gruppe: 'Berechnet', beispiel: 'false' },
    { pfad: 'BeamterUeber8Wohnung', label: 'Beamter, Wohnung über 8h', gruppe: 'Berechnet', beispiel: 'false' },
    { pfad: 'TkgSt8bis24', label: 'Erste Tätigkeitsstätte: 8-24h', gruppe: 'Berechnet', beispiel: 'true' },
    { pfad: 'TkgStUeber24', label: 'Erste Tätigkeitsstätte: über 24h', gruppe: 'Berechnet', beispiel: 'false' },
  ],
  zeilenQuellen: [{ pfad: 'Daten.EWT', label: 'EWT-Buchungen' }],
};

export default katalog;
