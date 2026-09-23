/**
 * Zeichnet einen Schriftzug als Platzhalter-Unterschrift für die Testdaten-Vorschau. Ohne ihn bliebe
 * die Signaturfläche als einziges Element ohne Beispielwert leer, obwohl sich gerade dort Größe,
 * Seitenverhältnis und Überdeckung der Unterschriftslinie schwer einschätzen lassen.
 *
 * Bewusst gezeichnet statt als Bild eingebettet: der echte Signatur-Pfad kommt ebenfalls aus einem
 * Canvas (`signaturePad.ts`), das Ergebnis hat also dieselbe Beschaffenheit (transparenter
 * Hintergrund, dunkle Linie, gleiche Kantenglättung).
 *
 * @param breite - Canvas-Breite in Pixeln.
 * @param hoehe - Canvas-Höhe in Pixeln.
 * @returns PNG als Data-URL; `undefined`, wenn kein 2D-Kontext verfügbar ist.
 */
export function beispielSignatur(breite = 400, hoehe = 140): string | undefined {
  const canvas = document.createElement('canvas');
  canvas.width = breite;
  canvas.height = hoehe;
  const ctx = canvas.getContext('2d');
  // Kein 2D-Kontext (headless/happy-dom): ohne Beispiel weitermachen, statt die Vorschau abzubrechen.
  if (!ctx) return undefined;

  ctx.strokeStyle = '#1b1b3a';
  ctx.lineWidth = Math.max(2, hoehe / 28);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  /**
   * Rechnet einen Anteil der Canvas-Breite in einen x-Pixelwert um.
   *
   * @param anteil - Position als Bruchteil von 0 bis 1.
   * @returns x-Koordinate in Pixeln.
   */
  const x = (anteil: number) => anteil * breite;
  /**
   * Rechnet einen Anteil der Canvas-Höhe in einen y-Pixelwert um.
   *
   * @param anteil - Position als Bruchteil von 0 bis 1.
   * @returns y-Koordinate in Pixeln.
   */
  const y = (anteil: number) => anteil * hoehe;

  ctx.beginPath();
  ctx.moveTo(x(0.06), y(0.72));
  ctx.bezierCurveTo(x(0.16), y(0.18), x(0.24), y(0.2), x(0.28), y(0.7));
  ctx.bezierCurveTo(x(0.32), y(0.32), x(0.42), y(0.3), x(0.44), y(0.68));
  ctx.bezierCurveTo(x(0.5), y(0.4), x(0.56), y(0.74), x(0.66), y(0.5));
  ctx.bezierCurveTo(x(0.74), y(0.32), x(0.8), y(0.66), x(0.94), y(0.44));
  ctx.stroke();

  // Unterstrich wie beim handschriftlichen Absetzen; macht die Unterkante der Fläche sichtbar.
  ctx.beginPath();
  ctx.moveTo(x(0.12), y(0.86));
  ctx.quadraticCurveTo(x(0.5), y(0.94), x(0.88), y(0.8));
  ctx.stroke();

  return canvas.toDataURL('image/png');
}
