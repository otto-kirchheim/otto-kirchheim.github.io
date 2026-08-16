/**
 * Zeichnet einen Schriftzug als Platzhalter-Unterschrift für die Testdaten-Vorschau. Ohne ihn
 * bliebe die Signaturfläche im Vorschau-PDF leer -- als einziges Element ohne Beispielwert, obwohl
 * gerade dort (Größe, Seitenverhältnis, Überdeckung der Unterschriftslinie) die Platzierung schwer
 * einzuschätzen ist.
 *
 * Bewusst gezeichnet statt als eingebettetes Bild abgelegt: der echte Signatur-Pfad kommt ebenfalls
 * aus einem Canvas (`signaturePad.ts`), das Ergebnis hat damit dieselbe Beschaffenheit --
 * transparenter Hintergrund, dunkle Linie, gleiche Kantenglättung.
 */
export function beispielSignatur(breite = 400, hoehe = 140): string | undefined {
  const canvas = document.createElement('canvas');
  canvas.width = breite;
  canvas.height = hoehe;
  const ctx = canvas.getContext('2d');
  // Kein 2D-Kontext (headless/happy-dom): dann eben ohne Beispiel, statt die Vorschau abzubrechen.
  if (!ctx) return undefined;

  ctx.strokeStyle = '#1b1b3a';
  ctx.lineWidth = Math.max(2, hoehe / 28);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const x = (anteil: number) => anteil * breite;
  const y = (anteil: number) => anteil * hoehe;

  ctx.beginPath();
  ctx.moveTo(x(0.06), y(0.72));
  ctx.bezierCurveTo(x(0.16), y(0.18), x(0.24), y(0.2), x(0.28), y(0.7));
  ctx.bezierCurveTo(x(0.32), y(0.32), x(0.42), y(0.3), x(0.44), y(0.68));
  ctx.bezierCurveTo(x(0.5), y(0.4), x(0.56), y(0.74), x(0.66), y(0.5));
  ctx.bezierCurveTo(x(0.74), y(0.32), x(0.8), y(0.66), x(0.94), y(0.44));
  ctx.stroke();

  // Unterstrich wie beim handschriftlichen Absetzen -- macht die Unterkante der Fläche sichtbar.
  ctx.beginPath();
  ctx.moveTo(x(0.12), y(0.86));
  ctx.quadraticCurveTo(x(0.5), y(0.94), x(0.88), y(0.8));
  ctx.stroke();

  return canvas.toDataURL('image/png');
}
