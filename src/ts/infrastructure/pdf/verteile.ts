import type { Layout, SeitenDef, Zeile } from '@otto-kirchheim/nebengeld-shared';

export interface Block {
  def: SeitenDef;
  zeilen: Zeile[];
}

/**
 * Verteilt Zeilen auf `ersteSeite` (immer genau einmal) und `weitereSeite` (bei Zeilenüberlauf
 * beliebig oft wiederholt). Wirft, wenn Zeilen übrig bleiben und keine `weitereSeite` konfiguriert ist.
 *
 * Waisenzeilen-Schutz: hätte die letzte Seite dadurch nur 1 Zeile, wird stattdessen eine Zeile von
 * der vorletzten Seite übernommen (sofern die dort noch mehr als 1 Zeile behält und die letzte Seite
 * Kapazität hat) — vermeidet eine fast leer wirkende letzte Seite.
 */
export function verteile(zeilen: Zeile[], layout: Layout): Block[] {
  const rest = [...zeilen];
  const bloecke: Block[] = [{ def: layout.ersteSeite, zeilen: rest.splice(0, layout.ersteSeite.maxZeilen) }];

  while (rest.length > 0) {
    if (!layout.weitereSeite) throw new Error(`${rest.length} Zeilen passen in kein Layout`);
    bloecke.push({ def: layout.weitereSeite, zeilen: rest.splice(0, layout.weitereSeite.maxZeilen) });
  }

  const letzterBlock = bloecke[bloecke.length - 1];
  const vorletzterBlock = bloecke[bloecke.length - 2];
  if (
    letzterBlock &&
    vorletzterBlock &&
    letzterBlock.zeilen.length === 1 &&
    vorletzterBlock.zeilen.length > 1 &&
    letzterBlock.zeilen.length < letzterBlock.def.maxZeilen
  ) {
    const geliehen = vorletzterBlock.zeilen.pop();
    if (geliehen) letzterBlock.zeilen.unshift(geliehen);
  }

  return bloecke;
}
