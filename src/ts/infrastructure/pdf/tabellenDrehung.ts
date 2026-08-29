import type { Drehung } from '@otto-kirchheim/nebengeld-shared';

export interface ZellRect {
  x: number;
  x2?: number;
  y: number;
  y2?: number;
  drehung?: Drehung;
}

function runde(n: number): number {
  return Number(n.toFixed(2));
}

/**
 * Bildet eine im aufrechten Tabellen-Layout gedachte Zell-Geometrie auf ihre Lage in einer um `grad`
 * (gegen den Uhrzeigersinn) gedrehten Vorlage ab. Die Tabellen-Konfiguration selbst bleibt aufrecht
 * (`startY`, `spalten[].x`, `hoehe` wie gehabt) -- nur der Renderer und die Editor-Vorschau drehen
 * die fertig berechnete Zelle über diese Funktion, und `Zelle.drehung` wird mitgezählt.
 * `seiteW`/`seiteH` sind die Punkt-Maße der gedrehten Zielseite (`seite.getSize()`).
 */
export function dreheTabellenZelle<T extends ZellRect>(zelle: T, grad: Drehung, seiteW: number, seiteH: number): T {
  if (grad === 0) return zelle;
  const punkt = (x: number, y: number): [number, number] =>
    grad === 90 ? [seiteW - y, x] : grad === 180 ? [seiteW - x, seiteH - y] : [y, seiteH - x];
  const [ax, ay] = punkt(zelle.x, zelle.y);
  const [bx, by] = punkt(zelle.x2 ?? zelle.x, zelle.y2 ?? zelle.y);
  return {
    ...zelle,
    x: runde(Math.min(ax, bx)),
    x2: runde(Math.max(ax, bx)),
    y: runde(Math.min(ay, by)),
    y2: runde(Math.max(ay, by)),
    drehung: (((zelle.drehung ?? 0) + grad) % 360) as Drehung,
  };
}

/**
 * Umkehrung von `dreheTabellenZelle` für einen Punkt -- rechnet eine auf der gedrehten Vorschau
 * gezogene Koordinate zurück in aufrechte Tabellen-Koordinaten (Editor-Drag).
 */
export function entdrehePunkt(x: number, y: number, grad: Drehung, seiteW: number, seiteH: number): [number, number] {
  if (grad === 90) return [y, seiteW - x];
  if (grad === 180) return [seiteW - x, seiteH - y];
  if (grad === 270) return [seiteH - y, x];
  return [x, y];
}
