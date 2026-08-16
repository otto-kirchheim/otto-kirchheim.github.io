import { describe, expect, it } from 'bun:test';
import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from '@cantoo/pdf-lib';
import { zeichne, type Zelle } from '@/infrastructure/pdf/zeichne';

type Gezeichnet = { text: string; x: number; y: number; size: number };

async function macheFont(): Promise<PDFFont> {
  const pdf = await PDFDocument.create();
  return pdf.embedFont(StandardFonts.Helvetica);
}

/** Fängt die `drawText`-Aufrufe ab, statt das erzeugte PDF wieder zu parsen. */
function macheSeite(gesammelt: Gezeichnet[]): PDFPage {
  return {
    drawText: (text: string, opts: { x: number; y: number; size: number }) => gesammelt.push({ text, ...opts }),
  } as unknown as PDFPage;
}

const ZELLE: Zelle = { x: 100, y: 200, x2: 300, y2: 220, size: 10 };

describe('zeichne', () => {
  it('zeichnet nichts bei leerem Text', async () => {
    const gesammelt: Gezeichnet[] = [];
    zeichne(macheSeite(gesammelt), '', ZELLE, await macheFont());
    expect(gesammelt).toHaveLength(0);
  });

  it('ohne x2/y2 bleibt x der Anker und y die Baseline (Verhalten aus Phase 3-8)', async () => {
    const gesammelt: Gezeichnet[] = [];
    zeichne(macheSeite(gesammelt), 'Test', { x: 50, y: 700, size: 10 }, await macheFont());
    expect(gesammelt[0]).toMatchObject({ x: 50, y: 700 });
  });

  it('align rechts spiegelt gegen die rechte Zellkante', async () => {
    const font = await macheFont();
    const gesammelt: Gezeichnet[] = [];
    zeichne(macheSeite(gesammelt), 'Test', { ...ZELLE, align: 'rechts' }, font);
    expect(gesammelt[0]!.x).toBeCloseTo(300 - font.widthOfTextAtSize('Test', 10), 5);
  });

  it('align zentriert setzt den Text mittig zwischen x und x2', async () => {
    const font = await macheFont();
    const gesammelt: Gezeichnet[] = [];
    zeichne(macheSeite(gesammelt), 'Test', { ...ZELLE, align: 'zentriert' }, font);
    const breite = font.widthOfTextAtSize('Test', 10);
    expect(gesammelt[0]!.x).toBeCloseTo(100 + (200 - breite) / 2, 5);
    // Mitte des Textes liegt auf der Zellmitte
    expect(gesammelt[0]!.x + breite / 2).toBeCloseTo(200, 5);
  });

  it('align zentriert ohne x2 zentriert um x herum', async () => {
    const font = await macheFont();
    const gesammelt: Gezeichnet[] = [];
    zeichne(macheSeite(gesammelt), 'Test', { x: 200, y: 100, size: 10, align: 'zentriert' }, font);
    expect(gesammelt[0]!.x).toBeCloseTo(200 - font.widthOfTextAtSize('Test', 10) / 2, 5);
  });

  it('mit y2 liegt die Baseline vertikal mittig in der Zelle', async () => {
    const gesammelt: Gezeichnet[] = [];
    zeichne(macheSeite(gesammelt), 'Test', ZELLE, await macheFont());
    // Zelle 200..220 (Höhe 20), Oberlänge 0.72*10 = 7.2 -> Baseline bei 200 + (20-7.2)/2
    expect(gesammelt[0]!.y).toBeCloseTo(206.4, 5);
  });

  it('autoGroesse verkleinert die Schrift, bis der Text in die Zellbreite passt', async () => {
    const font = await macheFont();
    const gesammelt: Gezeichnet[] = [];
    const text = 'Etwas zu langer Text';
    zeichne(macheSeite(gesammelt), text, { x: 100, y: 200, x2: 180, y2: 220, size: 12, autoGroesse: true }, font);
    expect(gesammelt[0]!.size).toBeLessThan(12);
    expect(font.widthOfTextAtSize(text, gesammelt[0]!.size)).toBeLessThanOrEqual(80);
  });

  it('autoGroesse fällt bei extrem langem Text auf die Mindestgröße zurück statt endlos zu schrumpfen', async () => {
    const gesammelt: Gezeichnet[] = [];
    zeichne(macheSeite(gesammelt), 'x'.repeat(500), { x: 100, y: 200, x2: 130, y2: 220, size: 12, autoGroesse: true }, await macheFont());
    expect(gesammelt[0]!.size).toBe(4);
  });

  it('autoGroesse lässt die Schrift unverändert, wenn der Text ohnehin passt', async () => {
    const gesammelt: Gezeichnet[] = [];
    zeichne(macheSeite(gesammelt), 'kurz', { x: 100, y: 200, x2: 400, y2: 220, size: 10, autoGroesse: true }, await macheFont());
    expect(gesammelt[0]!.size).toBe(10);
  });

  it('umbruch verteilt den Text an Wortgrenzen auf mehrere Zeilen', async () => {
    const font = await macheFont();
    const gesammelt: Gezeichnet[] = [];
    zeichne(macheSeite(gesammelt), 'Erste Zeile und zweite Zeile', { x: 100, y: 180, x2: 180, y2: 240, size: 8, umbruch: true }, font);
    expect(gesammelt.length).toBeGreaterThan(1);
    for (const g of gesammelt) expect(font.widthOfTextAtSize(g.text, g.size)).toBeLessThanOrEqual(80);
    // Folgezeilen liegen unter der ersten
    expect(gesammelt[1]!.y).toBeLessThan(gesammelt[0]!.y);
  });

  it('respektiert harte Umbrüche (\\n als Trenner zusammengesetzter Felder)', async () => {
    const gesammelt: Gezeichnet[] = [];
    zeichne(macheSeite(gesammelt), 'Zeile A\nZeile B', { x: 100, y: 180, x2: 400, y2: 240, size: 10, umbruch: true }, await macheFont());
    expect(gesammelt.map(g => g.text)).toEqual(['Zeile A', 'Zeile B']);
  });

  it('umbruch behält ein einzelnes zu breites Wort als eigene Zeile (kein Endlosloop)', async () => {
    const gesammelt: Gezeichnet[] = [];
    zeichne(macheSeite(gesammelt), 'Donaudampfschifffahrtsgesellschaft', { x: 100, y: 200, x2: 130, y2: 220, size: 10, umbruch: true }, await macheFont());
    expect(gesammelt).toHaveLength(1);
  });

  it('akzeptiert vertauschte Kanten (Rechteck von rechts unten nach links oben gezogen)', async () => {
    const font = await macheFont();
    const normal: Gezeichnet[] = [];
    const vertauscht: Gezeichnet[] = [];
    zeichne(macheSeite(normal), 'Test', { ...ZELLE, align: 'zentriert' }, font);
    zeichne(macheSeite(vertauscht), 'Test', { x: 300, y: 220, x2: 100, y2: 200, size: 10, align: 'zentriert' }, font);
    expect(vertauscht[0]!.x).toBeCloseTo(normal[0]!.x, 5);
    expect(vertauscht[0]!.y).toBeCloseTo(normal[0]!.y, 5);
  });
});
