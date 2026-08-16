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

/** Hat diese Seite Platz für eine Tabelle, die noch Zeilen offen hat? */
function nimmtZeilenAuf(def: SeitenDef, rest: TabellenZeilen): boolean {
  // `maxZeilen <= 0` zählt bewusst nicht: ein solcher Bereich nähme nie eine Zeile ab und die
  // Wiederholung liefe endlos.
  return def.bereiche.some(b => b.maxZeilen > 0 && (rest[b.tabelle]?.length ?? 0) > 0);
}

/**
 * Verteilt die Zeilen aller Tabellen auf die Seitenfolge `layout.seiten`.
 *
 * Die erste Seite kommt immer, jede weitere nur, wenn sie gebraucht wird: entweder weil eine ihrer
 * Tabellen noch Zeilen hat, oder weil sie gar keine Datentabelle trägt (reine Text-/Unterschrifts-
 * seite). Damit ergibt sich die Seitenzahl aus den Daten — bei Bereitschaft entfällt die BE-Seite,
 * wenn es keine Einsätze gab. Eine Seite mit `wiederholt` wird so lange erneut gerendert, wie ihre
 * Tabellen Zeilen liefern (EA: jede weitere Seite; Bereitschaft: ab Seite 3).
 *
 * Wirft, wenn am Ende Zeilen übrig bleiben — dann fehlt eine wiederholte Seite oder ein Bereich für
 * die betroffene Tabelle.
 */
export function verteile(zeilen: TabellenZeilen, layout: Layout): Block[] {
  if (layout.seiten.length === 0) throw new Error('Layout ohne Seiten');

  const rest: TabellenZeilen = Object.fromEntries(Object.entries(zeilen).map(([k, v]) => [k, [...v]]));
  const offen = () => Object.entries(rest).filter(([, v]) => v.length > 0);

  function nimm(def: SeitenDef): Block {
    const block: Block = { def, zeilen: {} };
    for (const bereich of def.bereiche) {
      block.zeilen[bereich.tabelle] = (rest[bereich.tabelle] ?? []).splice(0, Math.max(bereich.maxZeilen, 0));
    }
    return block;
  }

  const bloecke: Block[] = [];
  for (const [i, def] of layout.seiten.entries()) {
    const gebraucht = i === 0 || def.bereiche.length === 0 || nimmtZeilenAuf(def, rest);
    if (!gebraucht) continue;

    bloecke.push(nimm(def));
    // Wiederholung direkt hier, nicht erst am Ende der Folge: eine nachgelagerte Seite (z.B. mit
    // Unterschrift) muss hinter den wiederholten Seiten landen, nicht zwischen ihnen.
    if (def.wiederholt) while (nimmtZeilenAuf(def, rest)) bloecke.push(nimm(def));
  }

  const uebrig = offen();
  if (uebrig.length > 0) {
    const [name, zeilenRest] = uebrig[0]!;
    const wiederholte = layout.seiten.filter(s => s.wiederholt);
    if (wiederholte.length === 0) throw new Error(`${zeilenRest.length} Zeilen (${name}) passen in kein Layout — keine Seite ist als wiederholt markiert`);
    if (wiederholte.every(s => kapazitaet(s, name) === 0)) {
      throw new Error(`Tabelle "${name}" hat auf keiner wiederholten Seite einen Bereich, ${zeilenRest.length} Zeilen bleiben übrig`);
    }
    throw new Error(`${zeilenRest.length} Zeilen (${name}) passen in kein Layout`);
  }

  return bloecke;
}
