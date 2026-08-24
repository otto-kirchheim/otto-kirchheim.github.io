import SignaturePad from 'signature_pad';

export interface CanvasGroesse {
  breite: number;
  hoehe: number;
}

/** Berechnet die Canvas-Pixelgröße für scharfe Linien auf High-DPI-Displays (`devicePixelRatio`). */
export function skaliereFuerDisplay(anzeige: CanvasGroesse, ratio: number): CanvasGroesse {
  const faktor = Math.max(ratio || 1, 1);
  return { breite: Math.round(anzeige.breite * faktor), hoehe: Math.round(anzeige.hoehe * faktor) };
}

/** Erstellt ein `SignaturePad` auf dem übergebenen Canvas, High-DPI-skaliert, transparenter Hintergrund. */
export function erstelleSignaturPad(canvas: HTMLCanvasElement): SignaturePad {
  const ratio = window.devicePixelRatio || 1;
  const { breite, hoehe } = skaliereFuerDisplay({ breite: canvas.offsetWidth, hoehe: canvas.offsetHeight }, ratio);
  canvas.width = breite;
  canvas.height = hoehe;
  canvas.getContext('2d')?.scale(ratio, ratio);

  return new SignaturePad(canvas, { backgroundColor: 'rgba(0,0,0,0)' });
}

/** Liefert die Unterschrift als PNG-Data-URL, oder `null` wenn das Pad leer ist. */
export function holeSignaturPng(pad: SignaturePad): string | null {
  return pad.isEmpty() ? null : pad.toDataURL('image/png');
}

/** Lädt eine PNG-Data-URL zurück ins Pad (z.B. eine im localStorage gecachte Unterschrift). */
export function setzeSignaturPng(pad: SignaturePad, dataUrl: string): Promise<void> {
  return pad.fromDataURL(dataUrl);
}
