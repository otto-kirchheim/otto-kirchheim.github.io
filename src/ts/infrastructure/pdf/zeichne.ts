import type { PDFFont, PDFPage } from '@cantoo/pdf-lib';
import type { Ausrichtung } from '@otto-kirchheim/nebengeld-shared';

export interface Zelle {
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  size: number;
  autoGroesse?: boolean;
  umbruch?: boolean;
  align?: Ausrichtung;
}

/** Faustformel: die Oberlänge einer Helvetica-Zeile liegt bei ~0.72*size über der Baseline. */
const OBERLAENGE = 0.72;
const ZEILENABSTAND = 1.15;
const MIN_GROESSE = 4;

function breite(text: string, size: number, font: PDFFont): number {
  return font.widthOfTextAtSize(text, size);
}

/** Harte Umbrüche im Text -- entstehen z.B. durch `"\n"` als Trenner zusammengesetzter Felder. */
function harteZeilen(text: string): string[] {
  return text.split('\n');
}

/** Bricht an Wortgrenzen; ein Wort, das allein zu breit ist, bleibt ungebrochen in seiner Zeile. */
function umbrechen(text: string, maxBreite: number, size: number, font: PDFFont): string[] {
  const zeilen: string[] = [];
  for (const absatz of harteZeilen(text)) {
    let aktuell = '';
    for (const wort of absatz.split(/\s+/).filter(Boolean)) {
      const kandidat = aktuell ? `${aktuell} ${wort}` : wort;
      if (aktuell && breite(kandidat, size, font) > maxBreite) {
        zeilen.push(aktuell);
        aktuell = wort;
      } else {
        aktuell = kandidat;
      }
    }
    zeilen.push(aktuell);
  }
  return zeilen.length > 0 ? zeilen : [''];
}

/** Größte Schriftgröße ≤ `f.size`, bei der der Text in die Zelle passt. */
function passendeGroesse(text: string, f: Zelle, zellBreite: number, zellHoehe: number, font: PDFFont): number {
  let size = f.size;
  while (size > MIN_GROESSE) {
    const zeilen = f.umbruch ? umbrechen(text, zellBreite, size, font) : [text];
    const passtBreite = zeilen.every(z => breite(z, size, font) <= zellBreite);
    const passtHoehe = zellHoehe === 0 || zeilen.length * size * ZEILENABSTAND <= zellHoehe;
    if (passtBreite && passtHoehe) return size;
    size -= 0.25;
  }
  return MIN_GROESSE;
}

function ankerX(text: string, links: number, rechts: number | undefined, size: number, align: Ausrichtung | undefined, font: PDFFont): number {
  const b = breite(text, size, font);
  if (align === 'zentriert') return rechts === undefined ? links - b / 2 : links + (rechts - links - b) / 2;
  if (align === 'rechts') return (rechts ?? links) - b;
  return links;
}

/**
 * Zeichnet Text in eine Zelle. Ohne `x2`/`y2` verhält sich `f` wie ein reiner Ankerpunkt
 * (abwärtskompatibel zu Konfigurationen aus Phase 3–8), mit beiden Kanten wird der Text laut
 * `align` horizontal und immer vertikal mittig in der Zelle gesetzt. `umbruch` bricht an
 * Wortgrenzen um, `autoGroesse` verkleinert die Schrift, bis der Text in die Zelle passt.
 */
export function zeichne(seite: PDFPage, text: string, f: Zelle, font: PDFFont): void {
  if (!text) return;

  const links = Math.min(f.x, f.x2 ?? f.x);
  const rechts = f.x2 === undefined ? undefined : Math.max(f.x, f.x2);
  const zellBreite = rechts === undefined ? 0 : rechts - links;
  const zellHoehe = f.y2 === undefined ? 0 : Math.abs(f.y2 - f.y);

  const size = f.autoGroesse && zellBreite > 0 ? passendeGroesse(text, f, zellBreite, zellHoehe, font) : f.size;
  const zeilen = f.umbruch && zellBreite > 0 ? umbrechen(text, zellBreite, size, font) : [text];

  const blockHoehe = (zeilen.length - 1) * size * ZEILENABSTAND + size * OBERLAENGE;
  const untenKante = f.y2 === undefined ? f.y : Math.min(f.y, f.y2);
  // Ohne y2 bleibt `y` die Baseline der ERSTEN Zeile (altes Verhalten), sonst wird der ganze
  // Zeilenblock vertikal in der Zelle zentriert.
  const ersteBaseline = f.y2 === undefined ? f.y : untenKante + (zellHoehe - blockHoehe) / 2 + blockHoehe - size * OBERLAENGE;

  zeilen.forEach((zeile, i) => {
    if (!zeile) return;
    seite.drawText(zeile, {
      x: ankerX(zeile, links, rechts, size, f.align, font),
      y: ersteBaseline - i * size * ZEILENABSTAND,
      size,
      font,
    });
  });
}
