import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'bun:test';
import { PDFDocument } from '@cantoo/pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { familieUndSchnitt, vorlageFontFamilien } from '@/features/Admin/components/FormularEditor/vorlageFonts';

const leereVorlage = `${import.meta.dir}/../../../fixtures/test_1seitig.pdf`;
const latinFont = '/usr/share/fonts/liberation/LiberationSans-Regular.ttf';
const iconFont = '/usr/share/fonts/awesome-terminal-fonts/pomicons-regular.ttf';

function datei(bytes: Uint8Array | ArrayBuffer): File {
  return new File([bytes as BlobPart], 'vorlage.pdf', { type: 'application/pdf' });
}

async function pdfMitFont(pfad: string): Promise<File> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(readFileSync(pfad));
  doc.addPage([200, 120]).drawText('Ag', { x: 20, y: 60, size: 14, font });
  return datei(await doc.save());
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

  it.skipIf(!existsSync(latinFont))('nimmt eine Schrift mit vollem Latein-Zeichensatz in die Auswahl', async () => {
    const { familien, unbrauchbar } = await vorlageFontFamilien(await pdfMitFont(latinFont));
    expect(familien).toHaveLength(1);
    expect(familien[0]!.id).toMatch(/^vorlage:/);
    expect(familien[0]!.schnitte.normal).toBeInstanceOf(Uint8Array);
    expect(unbrauchbar).toEqual([]);
  });

  it.skipIf(!existsSync(iconFont))(
    'verwirft eine Schrift ohne Buchstaben/Ziffern (Icon-Font) als unbrauchbar',
    async () => {
      const { familien, unbrauchbar } = await vorlageFontFamilien(await pdfMitFont(iconFont));
      expect(familien).toEqual([]);
      expect(unbrauchbar.length).toBeGreaterThan(0);
    },
  );
});
