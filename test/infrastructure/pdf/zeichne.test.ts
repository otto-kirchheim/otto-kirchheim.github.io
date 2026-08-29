import { describe, expect, it } from 'bun:test';
import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from '@cantoo/pdf-lib';
import { zeichne, type FontSet, type Zelle } from '@/infrastructure/pdf/zeichne';

type Gezeichnet = { text: string; x: number; y: number; size: number; font: PDFFont; rotate?: { angle: number } };
type Linie = { x1: number; y1: number; x2: number; y2: number; thickness?: number };

async function macheFont(): Promise<PDFFont> {
  const pdf = await PDFDocument.create();
  return pdf.embedFont(StandardFonts.Helvetica);
}

/** FontSet für Tests, die keine Schriftschnitt-Auswahl prüfen -- alle Slots derselbe Schrift. */
async function macheFonts(font?: PDFFont): Promise<FontSet> {
  const basis = font ?? (await macheFont());
  return { helvetica: { normal: basis, fett: basis, kursiv: basis, fettKursiv: basis } };
}

/** Fängt `drawText`/`drawLine`-Aufrufe ab, statt das erzeugte PDF wieder zu parsen. */
function macheSeite(gesammelt: Gezeichnet[], linien: Linie[] = []): PDFPage {
  return {
    drawText: (text: string, opts: { x: number; y: number; size: number; font: PDFFont; rotate?: { angle: number } }) =>
      gesammelt.push({ text, ...opts }),
    drawLine: (opts: { start: { x: number; y: number }; end: { x: number; y: number }; thickness?: number }) =>
      linien.push({ x1: opts.start.x, y1: opts.start.y, x2: opts.end.x, y2: opts.end.y, thickness: opts.thickness }),
  } as unknown as PDFPage;
}

const ZELLE: Zelle = { x: 100, y: 200, x2: 300, y2: 220, size: 10 };

describe('zeichne', () => {
  it('zeichnet nichts bei leerem Text', async () => {
    const gesammelt: Gezeichnet[] = [];
    zeichne(macheSeite(gesammelt), '', ZELLE, await macheFonts());
    expect(gesammelt).toHaveLength(0);
  });

  it('ohne x2/y2 bleibt x der Anker und y die Baseline (Verhalten aus Phase 3-8)', async () => {
    const gesammelt: Gezeichnet[] = [];
    zeichne(macheSeite(gesammelt), 'Test', { x: 50, y: 700, size: 10 }, await macheFonts());
    expect(gesammelt[0]).toMatchObject({ x: 50, y: 700 });
  });

  it('align rechts spiegelt gegen die rechte Zellkante', async () => {
    const font = await macheFont();
    const gesammelt: Gezeichnet[] = [];
    zeichne(macheSeite(gesammelt), 'Test', { ...ZELLE, align: 'rechts' }, await macheFonts(font));
    expect(gesammelt[0]!.x).toBeCloseTo(300 - font.widthOfTextAtSize('Test', 10), 5);
  });

  it('align zentriert setzt den Text mittig zwischen x und x2', async () => {
    const font = await macheFont();
    const gesammelt: Gezeichnet[] = [];
    zeichne(macheSeite(gesammelt), 'Test', { ...ZELLE, align: 'zentriert' }, await macheFonts(font));
    const breite = font.widthOfTextAtSize('Test', 10);
    expect(gesammelt[0]!.x).toBeCloseTo(100 + (200 - breite) / 2, 5);
    // Mitte des Textes liegt auf der Zellmitte
    expect(gesammelt[0]!.x + breite / 2).toBeCloseTo(200, 5);
  });

  it('align zentriert ohne x2 zentriert um x herum', async () => {
    const font = await macheFont();
    const gesammelt: Gezeichnet[] = [];
    zeichne(macheSeite(gesammelt), 'Test', { x: 200, y: 100, size: 10, align: 'zentriert' }, await macheFonts(font));
    expect(gesammelt[0]!.x).toBeCloseTo(200 - font.widthOfTextAtSize('Test', 10) / 2, 5);
  });

  it('mit y2 liegt die Baseline vertikal mittig in der Zelle', async () => {
    const gesammelt: Gezeichnet[] = [];
    zeichne(macheSeite(gesammelt), 'Test', ZELLE, await macheFonts());
    // Zelle 200..220 (Höhe 20), Oberlänge 0.72*10 = 7.2 -> Baseline bei 200 + (20-7.2)/2
    expect(gesammelt[0]!.y).toBeCloseTo(206.4, 5);
  });

  it('Tabellenzeile: mit der Zeilenhöhe als y2 sitzt der Text mittig in der Zeile, nicht auf der Unterkante', async () => {
    // Genau die Zelle, die `build.ts` je Spalte baut: x-Kanten aus der Spalte, y-Kanten aus der
    // Zeilenhöhe. Ohne y2 wäre `y` die Grundlinie -- der Text säße dann auf der Zeilenunterkante.
    const gesammelt: Gezeichnet[] = [];
    const startY = 700;
    const hoehe = 14;
    const size = 9;
    zeichne(
      macheSeite(gesammelt),
      'Zelle',
      { x: 50, x2: 120, y: startY, y2: startY + hoehe, size },
      await macheFonts(),
    );
    expect(gesammelt[0]!.y).toBeCloseTo(startY + (hoehe - 0.72 * size) / 2, 5);
    expect(gesammelt[0]!.y).toBeGreaterThan(startY);
  });

  it('autoGroesse verkleinert die Schrift, bis der Text in die Zellbreite passt', async () => {
    const font = await macheFont();
    const gesammelt: Gezeichnet[] = [];
    const text = 'Etwas zu langer Text';
    zeichne(
      macheSeite(gesammelt),
      text,
      { x: 100, y: 200, x2: 180, y2: 220, size: 12, autoGroesse: true },
      await macheFonts(font),
    );
    expect(gesammelt[0]!.size).toBeLessThan(12);
    expect(font.widthOfTextAtSize(text, gesammelt[0]!.size)).toBeLessThanOrEqual(80);
  });

  it('autoGroesse fällt bei extrem langem Text auf die Mindestgröße zurück statt endlos zu schrumpfen', async () => {
    const gesammelt: Gezeichnet[] = [];
    zeichne(
      macheSeite(gesammelt),
      'x'.repeat(500),
      { x: 100, y: 200, x2: 130, y2: 220, size: 12, autoGroesse: true },
      await macheFonts(),
    );
    expect(gesammelt[0]!.size).toBe(4);
  });

  it('autoGroesse lässt die Schrift unverändert, wenn der Text ohnehin passt', async () => {
    const gesammelt: Gezeichnet[] = [];
    zeichne(
      macheSeite(gesammelt),
      'kurz',
      { x: 100, y: 200, x2: 400, y2: 220, size: 10, autoGroesse: true },
      await macheFonts(),
    );
    expect(gesammelt[0]!.size).toBe(10);
  });

  it('umbruch verteilt den Text an Wortgrenzen auf mehrere Zeilen', async () => {
    const font = await macheFont();
    const gesammelt: Gezeichnet[] = [];
    zeichne(
      macheSeite(gesammelt),
      'Erste Zeile und zweite Zeile',
      { x: 100, y: 180, x2: 180, y2: 240, size: 8, umbruch: true },
      await macheFonts(font),
    );
    expect(gesammelt.length).toBeGreaterThan(1);
    for (const g of gesammelt) expect(font.widthOfTextAtSize(g.text, g.size)).toBeLessThanOrEqual(80);
    // Folgezeilen liegen unter der ersten
    expect(gesammelt[1]!.y).toBeLessThan(gesammelt[0]!.y);
  });

  it('respektiert harte Umbrüche (\\n als Trenner zusammengesetzter Felder)', async () => {
    const gesammelt: Gezeichnet[] = [];
    zeichne(
      macheSeite(gesammelt),
      'Zeile A\nZeile B',
      { x: 100, y: 180, x2: 400, y2: 240, size: 10, umbruch: true },
      await macheFonts(),
    );
    expect(gesammelt.map(g => g.text)).toEqual(['Zeile A', 'Zeile B']);
  });

  it('umbruch behält ein einzelnes zu breites Wort als eigene Zeile (kein Endlosloop)', async () => {
    const gesammelt: Gezeichnet[] = [];
    zeichne(
      macheSeite(gesammelt),
      'Donaudampfschifffahrtsgesellschaft',
      { x: 100, y: 200, x2: 130, y2: 220, size: 10, umbruch: true },
      await macheFonts(),
    );
    expect(gesammelt).toHaveLength(1);
  });

  it('akzeptiert vertauschte Kanten (Rechteck von rechts unten nach links oben gezogen)', async () => {
    const fonts = await macheFonts();
    const normal: Gezeichnet[] = [];
    const vertauscht: Gezeichnet[] = [];
    zeichne(macheSeite(normal), 'Test', { ...ZELLE, align: 'zentriert' }, fonts);
    zeichne(macheSeite(vertauscht), 'Test', { x: 300, y: 220, x2: 100, y2: 200, size: 10, align: 'zentriert' }, fonts);
    expect(vertauscht[0]!.x).toBeCloseTo(normal[0]!.x, 5);
    expect(vertauscht[0]!.y).toBeCloseTo(normal[0]!.y, 5);
  });

  describe('Schriftschnitt (fett/kursiv, siehe FontSet)', () => {
    async function macheUnterscheidbareFonts(): Promise<FontSet> {
      const pdf = await PDFDocument.create();
      return {
        helvetica: {
          normal: await pdf.embedFont(StandardFonts.Helvetica),
          fett: await pdf.embedFont(StandardFonts.HelveticaBold),
          kursiv: await pdf.embedFont(StandardFonts.HelveticaOblique),
          fettKursiv: await pdf.embedFont(StandardFonts.HelveticaBoldOblique),
        },
        times: {
          normal: await pdf.embedFont(StandardFonts.TimesRoman),
          fett: await pdf.embedFont(StandardFonts.TimesRomanBold),
          kursiv: await pdf.embedFont(StandardFonts.TimesRomanItalic),
          fettKursiv: await pdf.embedFont(StandardFonts.TimesRomanBoldItalic),
        },
      };
    }

    it('ohne fett/kursiv wird die normale Schrift verwendet', async () => {
      const fonts = await macheUnterscheidbareFonts();
      const gesammelt: Gezeichnet[] = [];
      zeichne(macheSeite(gesammelt), 'Test', ZELLE, fonts);
      expect(gesammelt[0]!.font).toBe(fonts.helvetica!.normal);
    });

    it('fett wählt HelveticaBold', async () => {
      const fonts = await macheUnterscheidbareFonts();
      const gesammelt: Gezeichnet[] = [];
      zeichne(macheSeite(gesammelt), 'Test', { ...ZELLE, fett: true }, fonts);
      expect(gesammelt[0]!.font).toBe(fonts.helvetica!.fett);
    });

    it('kursiv wählt HelveticaOblique', async () => {
      const fonts = await macheUnterscheidbareFonts();
      const gesammelt: Gezeichnet[] = [];
      zeichne(macheSeite(gesammelt), 'Test', { ...ZELLE, kursiv: true }, fonts);
      expect(gesammelt[0]!.font).toBe(fonts.helvetica!.kursiv);
    });

    it('fett UND kursiv wählt HelveticaBoldOblique', async () => {
      const fonts = await macheUnterscheidbareFonts();
      const gesammelt: Gezeichnet[] = [];
      zeichne(macheSeite(gesammelt), 'Test', { ...ZELLE, fett: true, kursiv: true }, fonts);
      expect(gesammelt[0]!.font).toBe(fonts.helvetica!.fettKursiv);
    });

    it('schriftart wählt die Familie, dann den Schnitt', async () => {
      const fonts = await macheUnterscheidbareFonts();
      const gesammelt: Gezeichnet[] = [];
      zeichne(macheSeite(gesammelt), 'Test', { ...ZELLE, schriftart: 'times', fett: true }, fonts);
      expect(gesammelt[0]!.font).toBe(fonts.times!.fett);
    });

    it('unbekannte schriftart fällt auf helvetica zurück', async () => {
      const fonts = await macheUnterscheidbareFonts();
      const gesammelt: Gezeichnet[] = [];
      zeichne(macheSeite(gesammelt), 'Test', { ...ZELLE, schriftart: 'vorlage:Unbekannt' }, fonts);
      expect(gesammelt[0]!.font).toBe(fonts.helvetica!.normal);
    });
  });

  describe('unterstrichen', () => {
    it('ohne unterstrichen wird keine Linie gezeichnet', async () => {
      const gesammelt: Gezeichnet[] = [];
      const linien: Linie[] = [];
      zeichne(macheSeite(gesammelt, linien), 'Test', ZELLE, await macheFonts());
      expect(linien).toHaveLength(0);
    });

    it('zeichnet eine Linie unter der Baseline, so breit wie der Text', async () => {
      const font = await macheFont();
      const gesammelt: Gezeichnet[] = [];
      const linien: Linie[] = [];
      zeichne(macheSeite(gesammelt, linien), 'Test', { ...ZELLE, unterstrichen: true }, await macheFonts(font));
      expect(linien).toHaveLength(1);
      const breite = font.widthOfTextAtSize('Test', 10);
      expect(linien[0]!.y1).toBeCloseTo(gesammelt[0]!.y - 10 * 0.08, 5);
      expect(linien[0]!.x1).toBeCloseTo(gesammelt[0]!.x, 5);
      expect(linien[0]!.x2).toBeCloseTo(gesammelt[0]!.x + breite, 5);
      expect(linien[0]!.y2).toBeCloseTo(linien[0]!.y1, 5);
    });

    it('bricht der Text um, bekommt jede Zeile ihre eigene Unterstreichung', async () => {
      const gesammelt: Gezeichnet[] = [];
      const linien: Linie[] = [];
      zeichne(
        macheSeite(gesammelt, linien),
        'Zeile A\nZeile B',
        { x: 100, y: 180, x2: 400, y2: 240, size: 10, umbruch: true, unterstrichen: true },
        await macheFonts(),
      );
      expect(linien).toHaveLength(2);
    });
  });

  describe('Drehung', () => {
    // Hochkant beschriftetes Feld: 20pt breit, 200pt hoch -- so sitzt der Name am Blattrand.
    const HOCHKANT: Zelle = { x: 100, y: 400, x2: 120, y2: 600, size: 10 };

    it('gibt den Drehwinkel an pdf-lib weiter, 0° bleibt ohne rotate', async () => {
      const fonts = await macheFonts();
      const ohne: Gezeichnet[] = [];
      const mit: Gezeichnet[] = [];
      zeichne(macheSeite(ohne), 'Otto, Jan', ZELLE, fonts);
      zeichne(macheSeite(mit), 'Otto, Jan', { ...HOCHKANT, drehung: 90 }, fonts);

      expect(ohne[0]!.rotate).toBeUndefined();
      expect(mit[0]!.rotate?.angle).toBe(90);
    });

    it('bei 90° läuft die Ausrichtung über die Höhe, die Zentrierung über die Breite', async () => {
      const font = await macheFont();
      const gesammelt: Gezeichnet[] = [];
      zeichne(
        macheSeite(gesammelt),
        'Otto, Jan',
        { ...HOCHKANT, drehung: 90, align: 'zentriert' },
        await macheFonts(font),
      );

      const textBreite = font.widthOfTextAtSize('Otto, Jan', 10);
      // Laufrichtung ist +y: der Text startet so, dass er mittig zwischen y und y2 liegt.
      expect(gesammelt[0]!.y).toBeCloseTo(400 + (200 - textBreite) / 2, 5);
      // Quer wird wie sonst senkrecht zentriert -- bei 90° also zwischen x und x2.
      expect(gesammelt[0]!.x).toBeCloseTo(100 + (20 - 10 * 0.72) / 2 + 10 * 0.72, 5);
    });

    it('align rechts endet bei 90° an der oberen Kante', async () => {
      const font = await macheFont();
      const gesammelt: Gezeichnet[] = [];
      zeichne(
        macheSeite(gesammelt),
        'Otto, Jan',
        { ...HOCHKANT, drehung: 90, align: 'rechts' },
        await macheFonts(font),
      );
      expect(gesammelt[0]!.y).toBeCloseTo(600 - font.widthOfTextAtSize('Otto, Jan', 10), 5);
    });

    it('270° dreht die Laufrichtung um: align links beginnt oben', async () => {
      const gesammelt: Gezeichnet[] = [];
      zeichne(macheSeite(gesammelt), 'Otto, Jan', { ...HOCHKANT, drehung: 270 }, await macheFonts());
      expect(gesammelt[0]!.rotate?.angle).toBe(270);
      expect(gesammelt[0]!.y).toBeCloseTo(600, 5);
    });

    it('ohne Querkante bleibt die gesetzte Koordinate die Baseline (auch gedreht)', async () => {
      const gesammelt: Gezeichnet[] = [];
      zeichne(
        macheSeite(gesammelt),
        'Otto, Jan',
        { x: 40, y: 300, y2: 500, size: 10, drehung: 90 },
        await macheFonts(),
      );
      expect(gesammelt[0]!.x).toBe(40);
    });

    it('unterstrichen bei 90° liegt die Linie neben dem Text statt darunter (Text läuft entlang y)', async () => {
      const font = await macheFont();
      const gesammelt: Gezeichnet[] = [];
      const linien: Linie[] = [];
      zeichne(
        macheSeite(gesammelt, linien),
        'Otto, Jan',
        { ...HOCHKANT, drehung: 90, unterstrichen: true },
        await macheFonts(font),
      );
      const breite = font.widthOfTextAtSize('Otto, Jan', 10);
      // Bei 90° zeigen die Oberlängen nach -x (siehe ACHSEN-Kommentar) -- die Unterstreichung liegt
      // auf der Gegenseite, bei +x, als senkrechte Linie entlang der Laufrichtung (+y) des Textes.
      expect(linien[0]!.x1).toBeCloseTo(gesammelt[0]!.x + 10 * 0.08, 5);
      expect(linien[0]!.y1).toBeCloseTo(gesammelt[0]!.y, 5);
      expect(linien[0]!.x2).toBeCloseTo(linien[0]!.x1, 5);
      expect(linien[0]!.y2).toBeCloseTo(gesammelt[0]!.y + breite, 5);
    });
  });
});
