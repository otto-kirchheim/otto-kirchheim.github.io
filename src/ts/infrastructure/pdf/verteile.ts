import type { Layout, SeitenDef, Zeile } from '@otto-kirchheim/nebengeld-shared';

export interface Block {
  def: SeitenDef;
  zeilen: Zeile[];
}

/**
 * Verteilt Zeilen auf die Seiten eines Layouts. Die `wiederholSeite`-Seite wird bei Überlauf
 * beliebig oft wiederholt, die letzte Seite (Fuß/Unterschrift) bekommt immer den Rest.
 *
 * Waisenzeilen-Schutz: hätte die Abschlussseite dadurch nur 1 Zeile, wird stattdessen eine Zeile
 * von der vorletzten Seite übernommen (sofern die dort noch mehr als 1 Zeile behält und die
 * Abschlussseite Kapazität hat) — vermeidet eine fast leer wirkende letzte Seite.
 */
export function verteile(zeilen: Zeile[], layout: Layout): Block[] {
  const rest = [...zeilen];
  const bloecke: Block[] = [];
  const letzte = layout.seiten.length - 1;

  for (let i = 0; i < letzte; i++) {
    const def = layout.seiten[i];
    bloecke.push({ def, zeilen: rest.splice(0, def.maxZeilen) });

    if (i === layout.wiederholSeite)
      while (rest.length > layout.seiten[letzte].maxZeilen) bloecke.push({ def, zeilen: rest.splice(0, def.maxZeilen) });
  }

  const abschluss = layout.seiten[letzte];
  bloecke.push({ def: abschluss, zeilen: rest.splice(0, abschluss.maxZeilen) });

  if (rest.length) throw new Error(`${rest.length} Zeilen passen in kein Layout`);

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
