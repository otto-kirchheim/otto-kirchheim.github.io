import type { PDFFont, PDFPage } from '@cantoo/pdf-lib';
import type { Ausrichtung } from '@otto-kirchheim/nebengeld-shared';

/** Zeichnet Text an eine feste Koordinate, rechtsbündig gegen `x` gespiegelt bei `align: 'rechts'`. */
export function zeichne(
  seite: PDFPage,
  text: string,
  f: { x: number; y: number; size: number; align?: Ausrichtung },
  font: PDFFont,
): void {
  if (!text) return;
  const x = f.align === 'rechts' ? f.x - font.widthOfTextAtSize(text, f.size) : f.x;
  seite.drawText(text, { x, y: f.y, size: f.size, font });
}
