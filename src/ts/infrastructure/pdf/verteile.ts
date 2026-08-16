import type { Layout, SeitenDef, Zeile } from '@otto-kirchheim/nebengeld-shared';

/** Zeilen je Tabellen-Key. */
export type TabellenZeilen = Record<string, Zeile[]>;

export interface Block {
  def: SeitenDef;
  zeilen: TabellenZeilen;
}

function kapazitaet(def: SeitenDef, tabelle: string): number {
  return def.bereiche.find(b => b.tabelle === tabelle)?.maxZeilen ?? 0;
}

/**
 * Verteilt die Zeilen ALLER Tabellen auf `ersteSeite` (immer genau einmal) und `weitereSeite` (bei
 * Überlauf beliebig oft wiederholt). Jede Tabelle füllt dabei nur ihren eigenen Bereich auf der
 * Seite; eine Folgeseite entsteht, sobald irgendeine Tabelle noch Zeilen übrig hat. Wirft, wenn
 * Zeilen übrig bleiben und keine `weitereSeite` existiert oder diese für die betroffene Tabelle
 * keinen Bereich definiert.
 *
 * Waisenzeilen-Schutz je Tabelle: hätte die letzte Seite dort nur 1 Zeile, wird eine Zeile von der
 * vorletzten Seite übernommen (sofern die dort noch mehr als 1 behält) — vermeidet eine fast leer
 * wirkende letzte Seite.
 */
export function verteile(zeilen: TabellenZeilen, layout: Layout): Block[] {
  const rest: TabellenZeilen = Object.fromEntries(Object.entries(zeilen).map(([k, v]) => [k, [...v]]));
  const offen = () => Object.entries(rest).filter(([, v]) => v.length > 0);

  function nimm(def: SeitenDef): Block {
    const block: Block = { def, zeilen: {} };
    for (const bereich of def.bereiche) {
      block.zeilen[bereich.tabelle] = (rest[bereich.tabelle] ?? []).splice(0, bereich.maxZeilen);
    }
    return block;
  }

  const bloecke: Block[] = [nimm(layout.ersteSeite)];

  while (offen().length > 0) {
    const weitere = layout.weitereSeite;
    if (!weitere) {
      throw new Error(`${offen()[0]![1].length} Zeilen (${offen()[0]![0]}) passen in kein Layout`);
    }
    // Ohne Bereich auf der Folgeseite käme die Tabelle nie voran -- das wäre eine Endlosschleife.
    const ohnePlatz = offen().find(([name]) => kapazitaet(weitere, name) === 0);
    if (ohnePlatz) {
      throw new Error(`Tabelle "${ohnePlatz[0]}" hat auf der Folgeseite keinen Bereich, ${ohnePlatz[1].length} Zeilen bleiben übrig`);
    }
    bloecke.push(nimm(weitere));
  }

  return bloecke;
}
