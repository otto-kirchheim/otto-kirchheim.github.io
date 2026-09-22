import { LreType } from '@otto-kirchheim/nebengeld-shared';
import type { FeatureKatalog } from '../../components/FormularEditor/katalogTypen';
import { tag, zeitpunkt } from '../../components/FormularEditor/katalogTypen';

/**
 * Katalog-Beitrag der Bereitschaft (Formular `bereitschaft`): Bereitschaftszulage-Zwischenwerte (nur hier sichtbar,
 * sonst liefen sie bei ez/ewt/ea im Feld-Picker ins Leere) sowie die Zeilenfelder/-quellen der zwei Zeitraeume
 * (Zeitraum BZ, Einsatz BE). Konsument: `datenKatalog.ts` (Zusammenfuehrung), `FormularEditor/*`.
 */
const katalog: FeatureKatalog = {
  // Nur SummeBeamter3 ist ein Geldwert (`waehrung`), der Rest Ganzzahlen (Minuten/Stunden/Sätze).
  basisEintraege: [
    {
      pfad: 'Bereitschaftszulage.TarifBeamter',
      label: 'Tarifkraft/Beamter',
      gruppe: 'Bereitschaftszulage',
      beispiel: 'Tarifkraft',
    },
    {
      pfad: 'Bereitschaftszulage.BereitschaftsMinuten',
      label: 'Bereitschaftszeit abzgl. Einsätze (Minuten)',
      gruppe: 'Bereitschaftszulage',
      format: 'ganzzahl',
      beispiel: 6000,
    },
    {
      pfad: 'Bereitschaftszulage.SummeTarif',
      label: 'Summe Tarif (Std.)',
      gruppe: 'Bereitschaftszulage',
      format: 'ganzzahl',
      beispiel: 100,
    },
    {
      pfad: 'Bereitschaftszulage.SummeBeamter1',
      label: 'Summe 1 Beamter (Minuten)',
      gruppe: 'Bereitschaftszulage',
      format: 'ganzzahl',
      beispiel: 5400,
    },
    {
      pfad: 'Bereitschaftszulage.SummeBeamter2',
      label: 'Summe 2 Beamter (Sätze)',
      gruppe: 'Bereitschaftszulage',
      format: 'ganzzahl',
      beispiel: 11,
    },
    {
      pfad: 'Bereitschaftszulage.SummeBeamter3',
      label: 'Summe 3 Beamter (€)',
      gruppe: 'Bereitschaftszulage',
      format: 'waehrung',
      beispiel: 180.07,
    },
    {
      pfad: 'Bereitschaftszulage.GeldwertBeamter',
      label: 'Geldwert Beamter (Besoldungsgruppe, €)',
      gruppe: 'Bereitschaftszulage',
      format: 'waehrung',
      beispiel: 16.37,
    },
  ],
  // Bereitschaft hat ZWEI Zeilenquellen (BZ, BE). `Beginn`/`Ende` bedeuten dort Verschiedenes, daher
  // GETRENNTE Eintraege mit `quelle`: im Zeitraum (BZ) ein voller Zeitstempel, im Einsatz (BE) eine `"HH:mm"`-Uhrzeit.
  zeilenFelder: [
    {
      pfad: 'Beginn',
      label: 'Beginn (Zeitraum)',
      gruppe: 'Zeile BZ',
      format: 'datum',
      quelle: 'Daten.BZ',
      beispiel: i => zeitpunkt(i, 15.75),
    },
    {
      pfad: 'Ende',
      label: 'Ende (Zeitraum)',
      gruppe: 'Zeile BZ',
      format: 'datum',
      quelle: 'Daten.BZ',
      beispiel: i => zeitpunkt(i, 7, 1),
    },
    { pfad: 'Pause', label: 'Pause (Minuten)', gruppe: 'Zeile BZ', quelle: 'Daten.BZ', beispiel: 30 },
    // Kurzer Anruf WÄHREND des Zeitraums, nicht dessen volle Spanne (`createAddModalBereitschaftsEinsatz.tsx`).
    { pfad: 'Beginn', label: 'Beginn (Einsatz, HH:mm)', gruppe: 'Zeile BE', quelle: 'Daten.BE', beispiel: '01:15' },
    { pfad: 'Ende', label: 'Ende (Einsatz, HH:mm)', gruppe: 'Zeile BE', quelle: 'Daten.BE', beispiel: '02:00' },
    { pfad: 'Tag', label: 'Tag', gruppe: 'Zeile BE', format: 'datum', quelle: 'Daten.BE', beispiel: i => tag(i) },
    {
      pfad: 'Auftragsnummer',
      label: 'Auftragsnummer',
      gruppe: 'Zeile BE',
      quelle: 'Daten.BE',
      beispiel: i => `134567${111 + i}`,
    },
    {
      pfad: 'LRE',
      label: 'LRE',
      gruppe: 'Zeile BE',
      quelle: 'Daten.BE',
      beispiel: i => Object.values(LreType)[i % Object.values(LreType).length],
    },
    { pfad: 'PrivatKm', label: 'Privat-km', gruppe: 'Zeile BE', quelle: 'Daten.BE', beispiel: i => 8 + i * 2 },
    // Vorberechnet (`bzAbgeleiteteWerte`/`beAbgeleiteteWerte`), je Quelle eine eigene Gruppe. Beide heißen
    // `Dauer` (getrennt über `quelle`), die Labels MÜSSEN sich unterscheiden ("Zeitraum" vs. "Einsatz"),
    // sonst sind sie ohne Tabellen-Kontext (Kopf-/Fuß-Summenfeld) nicht auseinanderzuhalten. Minuten
    // (Zahl) statt HH:mm-Text wie bei EWT.
    { pfad: 'Dauer', label: 'Dauer Zeitraum (Minuten)', gruppe: 'Berechnet', quelle: 'Daten.BZ', beispiel: 450 },
    { pfad: 'Dauer', label: 'Dauer Einsatz (Minuten)', gruppe: 'Berechnet', quelle: 'Daten.BE', beispiel: 45 },
    // Euro-Betrag für Privat-km (Satz aus VorgabenGeld je nach Pers.TB, wie `calculateBerechnungRows.ts`);
    // `format` als Vorschlag, damit neue Spalten/Felder gleich mit Währungsformat starten.
    {
      pfad: 'PrivatKmBetrag',
      label: 'Privat-km Betrag (€)',
      gruppe: 'Berechnet',
      quelle: 'Daten.BE',
      format: 'waehrung',
      beispiel: 3.24,
    },
  ],
  zeilenQuellen: [
    { pfad: 'Daten.BZ', label: 'Bereitschaftszeiträume' },
    { pfad: 'Daten.BE', label: 'Bereitschaftseinsätze' },
  ],
};

export default katalog;
