import { degrees, type PDFFont, type PDFPage } from '@cantoo/pdf-lib';
import type { Ausrichtung, Drehung } from '@otto-kirchheim/nebengeld-shared';

export interface Zelle {
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  size: number;
  autoGroesse?: boolean;
  umbruch?: boolean;
  align?: Ausrichtung;
  drehung?: Drehung;
  fett?: boolean;
  kursiv?: boolean;
  unterstrichen?: boolean;
}

/**
 * Die vier Schnitte der Formular-Schriftfamilie (global gewählt, siehe `Layout.schriftart`), aus
 * denen `zeichne()` je Zelle nach `fett`/`kursiv` den passenden auswählt.
 */
export interface FontSet {
  normal: PDFFont;
  fett: PDFFont;
  kursiv: PDFFont;
  fettKursiv: PDFFont;
}

function waehleFont(f: Zelle, fonts: FontSet): PDFFont {
  if (f.fett && f.kursiv) return fonts.fettKursiv;
  if (f.fett) return fonts.fett;
  if (f.kursiv) return fonts.kursiv;
  return fonts.normal;
}

/**
 * Wie eine Drehung die beiden Achsen belegt. `laengs` ist die Achse, entlang der die Schrift läuft
 * (dort wirkt `align` und dort wird umbrochen), `quer` die Achse der Zeilenhöhe. `vor` ist die
 * Richtung auf der jeweiligen Achse: bei 90° läuft die Schrift nach oben (+y) und die Oberlängen
 * zeigen nach links (−x).
 */
const ACHSEN: Record<Drehung, { laengsX: boolean; laengsVor: 1 | -1; querVor: 1 | -1 }> = {
  0: { laengsX: true, laengsVor: 1, querVor: 1 },
  90: { laengsX: false, laengsVor: 1, querVor: -1 },
  180: { laengsX: true, laengsVor: -1, querVor: -1 },
  270: { laengsX: false, laengsVor: -1, querVor: 1 },
};

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

/**
 * Startpunkt des Textes auf der Laufachse. `vor` kehrt die Achse um (gedrehter Text läuft bei 180°
 * und 270° zur kleineren Koordinate hin), `laenge === 0` bedeutet: keine gegenüberliegende Kante
 * gesetzt, dann ist die Kante selbst der Anker.
 */
function ankerLaengs(
  textBreite: number,
  min: number,
  max: number,
  align: Ausrichtung | undefined,
  vor: 1 | -1,
): number {
  const laenge = max - min;
  if (align === 'zentriert') return vor === 1 ? min + (laenge - textBreite) / 2 : max - (laenge - textBreite) / 2;
  if (align === 'rechts') return vor === 1 ? max - textBreite : min + textBreite;
  return vor === 1 ? min : max;
}

/**
 * Zeichnet Text in eine Zelle. Ohne die gegenüberliegenden Kanten verhält sich `f` wie ein reiner
 * Ankerpunkt (abwärtskompatibel zu Konfigurationen aus Phase 3–8), mit beiden Kanten wird der Text
 * laut `align` längs und immer quer mittig in der Zelle gesetzt. `umbruch` bricht an Wortgrenzen um,
 * `autoGroesse` verkleinert die Schrift, bis der Text in die Zelle passt.
 *
 * `drehung` dreht den Text in der Zelle (90° = von unten nach oben lesbar, wie die schmalen
 * Namensfelder am Rand mancher Zettel). Gerechnet wird dafür nicht mit x/y, sondern mit Lauf- und
 * Querachse: die Formeln bleiben dieselben, nur ihre Zuordnung zu den Seitenkoordinaten dreht sich.
 */
export function zeichne(seite: PDFPage, text: string, f: Zelle, fonts: FontSet): void {
  if (!text) return;

  const font = waehleFont(f, fonts);
  const drehung = f.drehung ?? 0;
  const { laengsX, laengsVor, querVor } = ACHSEN[drehung];

  const xMin = Math.min(f.x, f.x2 ?? f.x);
  const xMax = Math.max(f.x, f.x2 ?? f.x);
  const yMin = Math.min(f.y, f.y2 ?? f.y);
  const yMax = Math.max(f.y, f.y2 ?? f.y);

  const laengsMin = laengsX ? xMin : yMin;
  const laengsMax = laengsX ? xMax : yMax;
  const querMin = laengsX ? yMin : xMin;
  const hatQuer = (laengsX ? f.y2 : f.x2) !== undefined;
  // Ohne Querkante bleibt die gesetzte Koordinate die Baseline der ERSTEN Zeile (altes Verhalten).
  const querAnker = laengsX ? f.y : f.x;
  const laenge = laengsMax - laengsMin;
  const querLaenge = hatQuer ? (laengsX ? yMax - yMin : xMax - xMin) : 0;

  const size = f.autoGroesse && laenge > 0 ? passendeGroesse(text, f, laenge, querLaenge, font) : f.size;
  const zeilen = f.umbruch && laenge > 0 ? umbrechen(text, laenge, size, font) : [text];

  const zeilenhoehe = size * ZEILENABSTAND;
  const oberlaenge = size * OBERLAENGE;
  const blockHoehe = (zeilen.length - 1) * zeilenhoehe + oberlaenge;
  // Der Zeilenblock wird quer in der Zelle zentriert; welche Blockkante dabei am Anfang liegt,
  // hängt von der Richtung der Oberlängen ab (bei 90° zeigen sie nach links).
  const mitte = querMin + (querLaenge - blockHoehe) / 2;
  const ersteBaseline = !hatQuer
    ? querAnker
    : querVor === 1
      ? mitte + (zeilen.length - 1) * zeilenhoehe
      : mitte + oberlaenge;

  // Rotation um den Textanker, wie pdf-lib sie für `drawText({ rotate })` anwendet (Standard-CCW-
  // Matrix, siehe `rotateRadians()`) -- nötig, um die Unterstreichung bei gedrehtem Text (z.B. 90°
  // Kopfspalten) am richtigen Fleck statt achsenparallel zur Seite zu zeichnen.
  const winkel = (drehung * Math.PI) / 180;
  const cosWinkel = Math.cos(winkel);
  const sinWinkel = Math.sin(winkel);
  const unterstreichAbstand = size * 0.08;
  const unterstreichDicke = Math.max(0.4, size * 0.045);

  zeilen.forEach((zeile, i) => {
    if (!zeile) return;
    const laengs = ankerLaengs(breite(zeile, size, font), laengsMin, laengsMax, f.align, laengsVor);
    const quer = ersteBaseline - querVor * i * zeilenhoehe;
    const x = laengsX ? laengs : quer;
    const y = laengsX ? quer : laengs;
    seite.drawText(zeile, {
      x,
      y,
      size,
      font,
      ...(drehung === 0 ? {} : { rotate: degrees(drehung) }),
    });

    if (f.unterstrichen) {
      const breiteZeile = breite(zeile, size, font);
      seite.drawLine({
        start: { x: x + unterstreichAbstand * sinWinkel, y: y - unterstreichAbstand * cosWinkel },
        end: {
          x: x + breiteZeile * cosWinkel + unterstreichAbstand * sinWinkel,
          y: y + breiteZeile * sinWinkel - unterstreichAbstand * cosWinkel,
        },
        thickness: unterstreichDicke,
      });
    }
  });
}
