import SignaturePad from 'signature_pad';

export interface CanvasGroesse {
  breite: number;
  hoehe: number;
}

/**
 * Berechnet die Canvas-Pixelgröße für scharfe Linien auf High-DPI-Displays (`devicePixelRatio`).
 *
 * @param anzeige - Angezeigte Größe in CSS-Pixeln.
 * @param ratio - `devicePixelRatio`; Werte unter 1 (und 0/NaN) zählen als 1.
 * @returns Gerundete Pixelgröße des Canvas.
 */
export function skaliereFuerDisplay(anzeige: CanvasGroesse, ratio: number): CanvasGroesse {
  const faktor = Math.max(ratio || 1, 1);
  return { breite: Math.round(anzeige.breite * faktor), hoehe: Math.round(anzeige.hoehe * faktor) };
}

/**
 * Lage der Hilfslinie in der Unterschriftsflaeche als Anteil der Hoehe von oben (0 = oben, 1 = unten). Pad und Formular-Editor
 * zeichnen sie an derselben Stelle: Wer auf der Linie unterschreibt, trifft im PDF die Linie des Formulars, sobald das Feld
 * dort so gesetzt wurde. Die Linie ist nur Anzeige, sie landet nicht im PNG.
 */
export const SIGNATUR_LINIE_ANTEIL = 0.8;

/** Angenommene Breite der Unterschriftsflaeche im Formular in PDF-Punkten (`signaturBild.w`, typisch 120-150). */
const PDF_FLAECHE_BREITE_PT = 140;
/** Gewuenschte Strichstaerken im fertigen PDF in Punkten: schnell/duenn bis langsam/kraeftig. `signature_pad` rechnet `max(maxWidth / (Geschwindigkeit + 1), minWidth)`: je groesser der Abstand der beiden,
 * desto deutlicher wirkt das Tempo. */
const MIN_STRICH_PT = 0.8;
const MAX_STRICH_PT = 2;

/**
 * Strichbreiten fuer das Pad in CSS-Pixeln, so gewaehlt, dass die Linie im PDF unabhaengig von der Feldgroesse gleich dick
 * ankommt. Das PNG wird beim Einbetten auf die Unterschriftsflaeche geschrumpft (`scaleToFit`), die Staerke schrumpft im
 * selben Verhaeltnis `Flaechenbreite / Canvas-Breite` (die `devicePixelRatio` kuerzt sich heraus). Feste Pixelwerte waeren auf
 * einem grossen Feld im PDF haarduenn.
 *
 * @param canvasBreite - Angezeigte Canvas-Breite in CSS-Pixeln.
 * @returns `minWidth`, `maxWidth` und `dotSize` (Punkt am Strichanfang, bewusst duenn, sonst wirkt er wie ein Klecks) fuer `SignaturePad`.
 */
export function strichbreiten(canvasBreite: number): { minWidth: number; maxWidth: number; dotSize: number } {
  const pxProPt = Math.max(canvasBreite, 1) / PDF_FLAECHE_BREITE_PT;
  return {
    minWidth: MIN_STRICH_PT * pxProPt,
    maxWidth: MAX_STRICH_PT * pxProPt,
    dotSize: MIN_STRICH_PT * pxProPt,
  };
}

/**
 * Erstellt ein `SignaturePad` auf dem übergebenen Canvas, High-DPI-skaliert, transparenter Hintergrund.
 * Setzt die interne Canvas-Größe aus `offsetWidth`/`offsetHeight` -- der Canvas muss dafür sichtbar sein.
 *
 * @param canvas - Sichtbarer Canvas, dessen CSS-Größe bereits feststeht.
 * @returns Das Pad.
 */
export function erstelleSignaturPad(canvas: HTMLCanvasElement): SignaturePad {
  const ratio = window.devicePixelRatio || 1;
  const { breite, hoehe } = skaliereFuerDisplay({ breite: canvas.offsetWidth, hoehe: canvas.offsetHeight }, ratio);
  canvas.width = breite;
  canvas.height = hoehe;
  canvas.getContext('2d')?.scale(ratio, ratio);
  // Niedriges Gewicht: die Breite folgt dem Tempo geglaettet; hohe Werte (0.6+) lassen sie springen, es entstehen Punkte im Strich.
  return new SignaturePad(canvas, {
    backgroundColor: 'rgba(0,0,0,0)',
    velocityFilterWeight: 0.4,
    ...strichbreiten(canvas.offsetWidth),
  });
}

/**
 * Liefert die Unterschrift als PNG-Data-URL.
 *
 * @param pad - Das Pad.
 * @returns PNG-Data-URL, `null` wenn das Pad leer ist.
 */
export function holeSignaturPng(pad: SignaturePad): string | null {
  return pad.isEmpty() ? null : pad.toDataURL('image/png');
}

/**
 * Lädt eine PNG-Data-URL zurück ins Pad (z.B. eine im localStorage gecachte Unterschrift).
 *
 * @param pad - Das Pad.
 * @param dataUrl - PNG-Data-URL.
 */
export function setzeSignaturPng(pad: SignaturePad, dataUrl: string): Promise<void> {
  return pad.fromDataURL(dataUrl);
}
