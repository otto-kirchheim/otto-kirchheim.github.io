import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'bun:test';
import { PDFDict, PDFDocument, PDFName, PDFRef } from '@cantoo/pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { familieUndSchnitt, vorlageFontFamilien } from '@/pages/admin/ui/FormularEditor/vorlageFonts';

const leereVorlage = `${import.meta.dir}/../../../../fixtures/test_1seitig.pdf`;
// Liegt pdfjs-dist bei (Abhaengigkeit) -- keine System-Schrift, die je nach Rechner fehlt.
const latinFont = new Uint8Array(
  readFileSync(Bun.fileURLToPath(import.meta.resolve('pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf'))),
);

function datei(bytes: Uint8Array | ArrayBuffer): File {
  return new File([bytes as BlobPart], 'vorlage.pdf', { type: 'application/pdf' });
}

async function pdfMitFont(font: Uint8Array): Promise<PDFDocument> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const eingebettet = await doc.embedFont(font);
  doc.addPage([200, 120]).drawText('Ag', { x: 20, y: 60, size: 14, font: eingebettet });
  return PDFDocument.load(await doc.save());
}

/** Benennt die `cmap`-Tabelle um: keine Unicode-Zuordnung mehr, wie bei Icon-/kaputten Subset-Fonts. */
function ohneCmap(font: Uint8Array): Uint8Array {
  const kopie = font.slice();
  const tabellen = new DataView(kopie.buffer).getUint16(4);
  for (let i = 0; i < tabellen; i++) {
    const pos = 12 + i * 16;
    if (String.fromCharCode(...kopie.subarray(pos, pos + 4)) === 'cmap')
      kopie.set(
        [...'xmap'].map(c => c.charCodeAt(0)),
        pos,
      );
  }
  return kopie;
}

/** Ersetzt das eingebettete Font-Programm (pdf-lib braucht beim Einbetten selbst eine cmap). */
function ersetzeFontProgramm(doc: PDFDocument, font: Uint8Array): void {
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFDict) || obj.get(PDFName.of('Type')) !== PDFName.of('FontDescriptor')) continue;
    const ref = obj.get(PDFName.of('FontFile2'));
    if (ref instanceof PDFRef) doc.context.assign(ref, doc.context.flateStream(font, { Length1: font.length }));
  }
}

describe('familieUndSchnitt', () => {
  it('trennt Subset-Präfix und Bold/Italic-Suffix ab', () => {
    expect(familieUndSchnitt('ABCDEF+LiberationSans-BoldItalic')).toEqual({
      familie: 'LiberationSans',
      fett: true,
      kursiv: true,
    });
  });

  it('erkennt Oblique als kursiv, Komma-getrennte Schnitte und PSMT-Suffixe', () => {
    expect(familieUndSchnitt('Helvetica-Oblique')).toEqual({ familie: 'Helvetica', fett: false, kursiv: true });
    expect(familieUndSchnitt('Arial,Bold')).toEqual({ familie: 'Arial', fett: true, kursiv: false });
    expect(familieUndSchnitt('TimesNewRomanPSMT')).toEqual({ familie: 'TimesNewRoman', fett: false, kursiv: false });
  });

  it('lässt einen schnittlosen Namen unverändert', () => {
    expect(familieUndSchnitt('CalibriRegular')).toEqual({ familie: 'Calibri', fett: false, kursiv: false });
    expect(familieUndSchnitt('DejaVuSans')).toEqual({ familie: 'DejaVuSans', fett: false, kursiv: false });
  });
});

describe('vorlageFontFamilien', () => {
  it('liefert leere Listen für eine PDF ohne eingebettete Fonts', async () => {
    expect(await vorlageFontFamilien(datei(readFileSync(leereVorlage)))).toEqual({ familien: [], unbrauchbar: [] });
  });

  it('liefert leere Listen für Bytes, die keine gültige PDF sind', async () => {
    expect(await vorlageFontFamilien(datei(new Uint8Array([1, 2, 3, 4])))).toEqual({ familien: [], unbrauchbar: [] });
  });

  it('nimmt eine Schrift mit vollem Latein-Zeichensatz in die Auswahl', async () => {
    const doc = await pdfMitFont(latinFont);
    const { familien, unbrauchbar } = await vorlageFontFamilien(datei(await doc.save()));
    expect(familien).toHaveLength(1);
    expect(familien[0]!.id).toMatch(/^vorlage:/);
    expect(familien[0]!.schnitte.normal).toBeInstanceOf(Uint8Array);
    expect(unbrauchbar).toEqual([]);
  });

  it('verwirft eine Schrift ohne Buchstaben/Ziffern-Zuordnung (Icon-/Teil-Font) als unbrauchbar', async () => {
    const doc = await pdfMitFont(latinFont);
    ersetzeFontProgramm(doc, ohneCmap(latinFont));
    const { familien, unbrauchbar } = await vorlageFontFamilien(datei(await doc.save()));
    expect(familien).toEqual([]);
    expect(unbrauchbar.length).toBeGreaterThan(0);
  });
});
