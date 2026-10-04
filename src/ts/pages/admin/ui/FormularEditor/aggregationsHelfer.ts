import type { Spalte, TabellenDef } from '@otto-kirchheim/nebengeld-shared';
import type { KatalogEintrag } from './datenKatalog';

/**
 * Berechnete/Ankreuz-Spalten als Katalogeinträge. `mitBerechnetenSpalten()` (`shared/lib/pdf/
 * tabellenZeilen.ts`) trägt ihren Wert schon unter `key` in die Zeile ein, andere Rechnungen können
 * sie also direkt referenzieren. Genutzt von der Feldliste (alle Tabellen) und je einer `TabellenBlock`
 * (nur deren Spalten).
 *
 * @param spalten - Spalten einer Tabelle; berücksichtigt werden nur solche mit `berechnet` oder `wenn` und `key`.
 * @param gruppe - Gruppenname, unter dem die Einträge in der Auswahl erscheinen.
 * @returns Katalogeinträge mit `pfad` = Spalten-`key` und `label` = Spalten-Label (sonst `key`).
 */
export function berechneteEintraege(spalten: Spalte[], gruppe: string): KatalogEintrag[] {
  return spalten
    .filter(sp => (sp.berechnet || sp.wenn) && sp.key)
    .map(sp => ({ pfad: sp.key, label: sp.label ?? sp.key, gruppe }));
}

/**
 * Alle berechneten/Ankreuz-Spalten über SÄMTLICHE Tabellen, per `pfad` dedupliziert (bei
 * Namensgleichheit gewinnt die zuletzt iterierte Tabelle) -- nur der Fallback für eine nicht
 * eingegrenzte Aggregation (`Berechnet.tabellen` leer). Bei Namenskollisionen gezielt über die
 * Tabellenauswahl in `AggregationEditor` eingrenzen, statt sich auf die Dedup-Reihenfolge zu verlassen.
 *
 * @param tabellen - Tabellendefinitionen der Version, nach Name.
 * @returns Deduplizierte Katalogeinträge aller Tabellen.
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
