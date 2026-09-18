import type { Spalte, TabellenDef } from '@otto-kirchheim/nebengeld-shared';
import type { KatalogEintrag } from './datenKatalog';

/**
 * Berechnete/Ankreuz-Spalten als Katalogeinträge -- `mitBerechnetenSpalten()` in `shared` trägt
 * ihren Wert schon unter `key` in die Zeile ein, andere Rechnungen können sie also direkt
 * referenzieren, statt dieselbe Rechnung ein zweites Mal aufzubauen. Gemeinsam genutzt von der
 * Feldliste (alle Tabellen) und je einer einzelnen `TabellenBlock` (nur deren eigene Spalten).
 */
export function berechneteEintraege(spalten: Spalte[], gruppe: string): KatalogEintrag[] {
  return spalten
    .filter(sp => (sp.berechnet || sp.wenn) && sp.key)
    .map(sp => ({ pfad: sp.key, label: sp.label ?? sp.key, gruppe }));
}

/**
 * Alle berechneten/Ankreuz-Spalten über SÄMTLICHE Tabellen, per `pfad` dedupliziert (bei
 * Namensgleichheit gewinnt die zuletzt iterierte Tabelle, andere gehen verloren) -- nur der
 * Fallback für eine NICHT auf eine Tabelle eingegrenzte Aggregation (`Berechnet.tabelle` unset).
 * Bei Namenskollisionen zwischen Tabellen (z.B. gleicher Spalten-Key in zwei Tabellen) gezielt über
 * die Tabellenauswahl in `AggregationEditor` eingrenzen, statt sich auf diese Dedup-Reihenfolge zu
 * verlassen.
 */
export function alleBerechneteEintraege(tabellen: Record<string, TabellenDef>): KatalogEintrag[] {
  return [
    ...new Map(
      Object.values(tabellen)
        .flatMap(t => berechneteEintraege(t.spalten, 'Berechnete/Ankreuz-Spalten'))
        .map(e => [e.pfad, e]),
    ).values(),
  ];
}
