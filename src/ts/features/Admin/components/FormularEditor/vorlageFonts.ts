import { decodePDFRawStream, PDFArray, PDFDict, PDFDocument, PDFName, PDFRawStream, PDFStream } from '@cantoo/pdf-lib';

type Fontkit = Parameters<PDFDocument['registerFontkit']>[0];

/**
 * In der Vorlage eingebettete Schriftfamilie -- Testschritt (F3b): der Editor bietet sie zusätzlich
 * zu den Standard-14 an, `build()` bettet sie NUR in der Vorschau ein (`FormularEditor.testdatenVorschau`),
 * der Download fällt bis auf Weiteres auf Helvetica zurück. LibreOffice/Word betten regelmäßig nur
 * einen Teilzeichensatz ein -- fehlende Glyphen erscheinen dann als leere Kästchen; genau das soll
 * dieser Schritt sichtbar machen, bevor über einen echten Font-Upload (F3c) entschieden wird.
 */
export interface VorlageFontFamilie {
  /** `vorlage:<Familienname>` -- Wert für `Layout.schriftart`. */
  id: string;
  label: string;
  /** PostScript-Namen der Font-Programme, aus denen die Familie zusammengesetzt ist (Info-Zeile). */
  psNamen: string[];
  schnitte: FontSchnitte;
}

export interface FontSchnitte {
  normal?: Uint8Array;
  fett?: Uint8Array;
  kursiv?: Uint8Array;
  fettKursiv?: Uint8Array;
}

export interface VorlageFontErgebnis {
  familien: VorlageFontFamilie[];
  /** PostScript-Namen eingebetteter Fonts, die sich NICHT als Formularschrift eignen: fontkit kann
   *  sie nicht öffnen, oder die Unicode-Zuordnung deckt Buchstaben/Ziffern nicht ab (Teilzeichensatz
   *  bzw. kaputte cmap -- typisch für virtuelle Drucker wie PDF24). */
  unbrauchbar: string[];
}

/** Zeichen, die eine als Formularschrift taugliche Familie zuverlässig abbilden muss. */
const PROBE_ZEICHEN = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

const SCHNITT_WORT =
  /[\s\-_,]*(bold|italic|oblique|regular|book|roman|black|heavy|semibold|demibold|light|medium|thin|condensed|kursiv|fett|psmt|mt|ps|std)\b/gi;

/** Familienname + Schnitt aus einem PostScript-Namen wie `ABCDEF+LiberationSans-BoldItalic`. */
export function familieUndSchnitt(psName: string): { familie: string; fett: boolean; kursiv: boolean } {
  const rein = psName.replace(/^[A-Z]{6}\+/, '');
  const fett = /bold|black|heavy|semibold|demibold/i.test(rein);
  const kursiv = /italic|oblique|kursiv/i.test(rein);
  const familie = (rein.split(/[-,]/)[0] ?? rein).replace(SCHNITT_WORT, '').trim() || rein;
  return { familie, fett, kursiv };
}

/** FontDescriptor-Dicts eines Font-Eintrags -- direkt oder (Type0) über die DescendantFonts. */
function fontDescriptors(doc: PDFDocument, fontDict: PDFDict): PDFDict[] {
  const descriptors: PDFDict[] = [];
  const descendant = fontDict.lookupMaybe(PDFName.of('DescendantFonts'), PDFArray);
  if (descendant) {
    for (let i = 0; i < descendant.size(); i++) {
      const cid = doc.context.lookupMaybe(descendant.get(i), PDFDict);
      const d = cid?.lookupMaybe(PDFName.of('FontDescriptor'), PDFDict);
      if (d) descriptors.push(d);
    }
  }
  const eigen = fontDict.lookupMaybe(PDFName.of('FontDescriptor'), PDFDict);
  if (eigen) descriptors.push(eigen);
  return descriptors;
}

/** Alle eingebetteten TrueType-/OpenType-Font-Programme der PDF (FontFile/FontFile3 = Type1/CFF-only
 *  werden übersprungen -- fontkit kann sie nicht wieder einbetten). */
function* fontProgramme(doc: PDFDocument): Generator<{ psName: string; bytes: Uint8Array }> {
  for (const page of doc.getPages()) {
    const fontDict = page.node.Resources()?.lookupMaybe(PDFName.of('Font'), PDFDict);
    if (!fontDict) continue;
    for (const [, wert] of fontDict.entries()) {
      const fd = doc.context.lookupMaybe(wert, PDFDict);
      if (!fd) continue;
      for (const d of fontDescriptors(doc, fd)) {
        const psName = (d.lookupMaybe(PDFName.of('FontName'), PDFName)?.asString() ?? '').replace(/^\//, '');
        for (const key of ['FontFile2', 'FontFile3'] as const) {
          const stream = d.lookupMaybe(PDFName.of(key), PDFStream);
          if (stream instanceof PDFRawStream) yield { psName, bytes: decodePDFRawStream(stream).decode() };
        }
      }
    }
  }
}

/**
 * Taugt das Font-Programm als Formularschrift? fontkit muss es öffnen können UND die Unicode-cmap
 * muss den Großteil von Ziffern + Latein-Buchstaben treffen. Subset-Fonts aus virtuellen Druckern
 * (PDF24) mappen Ziffern/Buchstaben oft gar nicht oder auf die falsche Glyphe -- beim Einbetten
 * neuer Feldwerte käme dann Zeichensalat heraus.
 */
function tauglich(fontkit: Fontkit, bytes: Uint8Array): boolean {
  try {
    const font = fontkit.create(bytes as unknown as Buffer) as {
      glyphForCodePoint?: (cp: number) => { id: number };
    };
    if (typeof font.glyphForCodePoint !== 'function') return false;
    let treffer = 0;
    for (const ch of PROBE_ZEICHEN) {
      try {
        if (font.glyphForCodePoint(ch.codePointAt(0)!).id !== 0) treffer++;
      } catch {
        /* Zeichen nicht abbildbar */
      }
    }
    return treffer >= PROBE_ZEICHEN.length * 0.8;
  } catch {
    return false;
  }
}

/**
 * Liest die in einer Vorlagen-PDF eingebetteten Schriftfamilien aus. Reine Lese-Operation auf einer
 * lokalen Datei. Trennt taugliche Familien von solchen, deren Zeichensatz für Formularwerte nicht
 * reicht (`unbrauchbar`). Bei unlesbarer PDF oder ohne eingebettete Fonts kommen leere Listen zurück.
 */
export async function vorlageFontFamilien(datei: File): Promise<VorlageFontErgebnis> {
  const leer: VorlageFontErgebnis = { familien: [], unbrauchbar: [] };
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(await datei.arrayBuffer(), { updateMetadata: false });
  } catch {
    return leer;
  }

  const programme = [...fontProgramme(doc)];
  if (programme.length === 0) return leer;
  // fontkit (~340 kB gzip) erst laden, wenn die Vorlage überhaupt eingebettete Fonts hat.
  const { default: fontkit } = await import('@pdf-lib/fontkit');

  const familien = new Map<string, VorlageFontFamilie>();
  const unbrauchbar: string[] = [];
  const gesehen = new Set<string>();
  for (const { psName, bytes } of programme) {
    if (!psName || gesehen.has(psName)) continue;
    gesehen.add(psName);
    if (!tauglich(fontkit, bytes)) {
      unbrauchbar.push(psName.replace(/^[A-Z]{6}\+/, ''));
      continue;
    }

    const { familie, fett, kursiv } = familieUndSchnitt(psName);
    const id = `vorlage:${familie}`;
    const eintrag = familien.get(id) ?? { id, label: `${familie} (Vorlage)`, psNamen: [], schnitte: {} };
    eintrag.psNamen.push(psName);
    const slot: keyof FontSchnitte = fett && kursiv ? 'fettKursiv' : fett ? 'fett' : kursiv ? 'kursiv' : 'normal';
    eintrag.schnitte[slot] ??= bytes;
    familien.set(id, eintrag);
  }

  const familienListe = [...familien.values()]
    .map(f => {
      f.schnitte.normal ??= f.schnitte.fett ?? f.schnitte.kursiv ?? f.schnitte.fettKursiv;
      return f;
    })
    .filter(f => f.schnitte.normal);

  return { familien: familienListe, unbrauchbar: [...new Set(unbrauchbar)] };
}
