import type { ListenGruppe, TabellenDef, Zeile } from '@otto-kirchheim/nebengeld-shared';

/** Die Gruppen einer Tabelle samt der aus den Daten ermittelten Platzvergabe. */
export interface ListenAufloesung {
  gruppen: Record<string, ListenGruppe>;
  /** Belegte Schlüssel je Gruppe, in Platzreihenfolge */
  belegung: Record<string, string[]>;
}

/** Platzvergabe aller Gruppen einer Tabelle — einmal je Dokument, gültig für alle Seiten. */
export function loeseListenAuf(tabelle: TabellenDef, zeilen: Zeile[]): ListenAufloesung | undefined {
  if (!tabelle.listen) return undefined;
  const belegung: Record<string, string[]> = {};
  for (const [name, gruppe] of Object.entries(tabelle.listen)) belegung[name] = listenBelegung(zeilen, gruppe);
  return { gruppen: tabelle.listen, belegung };
}

/** Schlüssel auf einem Platz, `undefined` wenn der Platz leer bleibt (weniger Schlüssel als Plätze). */
export function schluesselAufPlatz(
  aufloesung: ListenAufloesung | undefined,
  gruppe: string,
  index: number,
): string | undefined {
  return aufloesung?.belegung[gruppe]?.[index];
}

/** Die Listeneinträge einer Zeile; alles, was nicht wie eine Liste von Objekten aussieht, fällt weg. */
function eintraege(zeile: Zeile, gruppe: ListenGruppe): Record<string, unknown>[] {
  const roh = zeile[gruppe.quelle];
  if (!Array.isArray(roh)) return [];
  return roh.filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null);
}

/**
 * Welche Schlüssel die Plätze einer Gruppe belegen — über ALLE Zeilen des Dokuments bestimmt, nicht
 * je Seite: die Überschriften müssen auf jeder Seite dieselben sein, sonst stünde auf Seite 2 eine
 * andere Zulage über derselben Spalte.
 *
 * Mit `auswahl` gibt deren Reihenfolge die Platzvergabe vor (nur tatsächlich vorkommende Schlüssel
 * belegen einen Platz), ohne sie zählt das erste Vorkommen in den Daten.
 */
export function listenBelegung(zeilen: Zeile[], gruppe: ListenGruppe): string[] {
  const vorhanden = new Set<string>();
  const reihenfolge: string[] = [];

  for (const zeile of zeilen) {
    for (const eintrag of eintraege(zeile, gruppe)) {
      const schluessel = eintrag[gruppe.schluessel];
      if (schluessel === null || schluessel === undefined || schluessel === '') continue;
      const key = String(schluessel);
      if (vorhanden.has(key)) continue;
      vorhanden.add(key);
      reihenfolge.push(key);
    }
  }

  return gruppe.auswahl ? gruppe.auswahl.filter(k => vorhanden.has(k)) : reihenfolge;
}

/** Wert dieser Zeile zum Schlüssel eines Platzes; `undefined`, wenn die Zeile ihn nicht führt. */
export function listenWert(zeile: Zeile, gruppe: ListenGruppe, schluessel: string): unknown {
  const treffer = eintraege(zeile, gruppe).find(e => String(e[gruppe.schluessel] ?? '') === schluessel);
  return treffer?.[gruppe.wert];
}

/** Beschriftung eines Schlüssels für die Spaltenüberschrift; ohne Eintrag der Schlüssel selbst. */
export function listenBeschriftung(gruppe: ListenGruppe, schluessel: string): string {
  return gruppe.beschriftungen?.[schluessel] ?? schluessel;
}
