import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'bun:test';
import { PDFDocument } from '@cantoo/pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { istDbFamilie } from '@/shared/lib/pdf/dbFonts';

const assetDir = `${import.meta.dir}/../../../../node_modules/@db-ux/db-theme-fonts/build/assets`;
const schnitte = ['regular', 'regularitalic', 'bold', 'bolditalic'] as const;
const haveAssets = existsSync(`${assetDir}/dbneoscreensans-regular.woff2`);

describe('istDbFamilie', () => {
  it('erkennt die beiden DB-Familien', () => {
    expect(istDbFamilie('db-sans')).toBe(true);
    expect(istDbFamilie('db-head')).toBe(true);
    expect(istDbFamilie('helvetica')).toBe(false);
    expect(istDbFamilie('vorlage:DBOffice')).toBe(false);
  });
});

// Regressionsschutz: `@pdf-lib/fontkit` 1.1.1 kann die DB-Neo-Schriften nicht subsetten
// (`pdf.save()` -> `Cannot read properties of undefined (reading 'pos')`). `dbFonts.ts` entpackt
// deshalb per `woff2-encoder` nach TrueType, `build.ts` bettet OHNE Subset ein. Dieser Test
// fährt genau diesen Weg mit den echten Assets ab.
describe.skipIf(!haveAssets)('DB-woff2 -> TrueType -> vollständige Einbettung', () => {
  for (const schnitt of schnitte) {
    it(`bettet dbneoscreensans-${schnitt} ohne Crash ein`, async () => {
      const woff2 = new Uint8Array(readFileSync(`${assetDir}/dbneoscreensans-${schnitt}.woff2`));
      const { default: entpacke } = await import('woff2-encoder/decompress');
      const ttf = await entpacke(woff2);
      expect([...ttf.slice(0, 4)]).toEqual([0, 1, 0, 0]); // SFNT-Magic (0x00010000)

      const pdf = await PDFDocument.create();
      pdf.registerFontkit(fontkit);
      const font = await pdf.embedFont(ttf); // ohne { subset: true }
      pdf.addPage([320, 120]).drawText('Kürzung März 1.234,56 €', { x: 15, y: 60, size: 13, font });

      const bytes = await pdf.save();
      expect(bytes.length).toBeGreaterThan(2000);
      expect(font.widthOfTextAtSize('Test', 10)).toBeGreaterThan(0);
    });
  }
});
