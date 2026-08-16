import { describe, expect, it } from 'bun:test';
import { verteile } from '@/infrastructure/pdf/verteile';
import type { Layout, SeitenDef, Zeile } from '@otto-kirchheim/nebengeld-shared';

const MAX_ZEILEN = 2;

function macheSeite(quelle: number): SeitenDef {
  return { quelle, bereiche: [{ tabelle: 'haupt', startY: 700, maxZeilen: MAX_ZEILEN }], felder: {} };
}

// Ein Layout: erste Seite (Kopf+Zeilen) + weitere Seite (Kennzeile+Zeilen), wiederholt bei Bedarf.
const layout: Layout = {
  template: 'test.pdf',
  ersteSeite: macheSeite(0),
  weitereSeite: macheSeite(1),
};

function macheZeilen(anzahl: number): Zeile[] {
  return Array.from({ length: anzahl }, (_, i) => ({ text: `Zeile ${i + 1}` }));
}

function groessen(zeilen: Zeile[]): number[] {
  return verteile({ haupt: zeilen }, layout).map(b => (b.zeilen.haupt ?? []).length);
}

describe('verteile', () => {
  it('0 Zeilen: nur die erste Seite wird erzeugt (keine erzwungenen leeren Folgeseiten)', () => {
    expect(groessen(macheZeilen(0))).toEqual([0]);
  });

  it('1 Zeile: passt komplett auf die erste Seite', () => {
    expect(groessen(macheZeilen(1))).toEqual([1]);
  });

  it(`maxZeilen (${MAX_ZEILEN}) Zeilen: füllt genau die erste Seite`, () => {
    expect(groessen(macheZeilen(MAX_ZEILEN))).toEqual([2]);
  });

  it(`maxZeilen+1 (${MAX_ZEILEN + 1}) Zeilen: erste Seite voll, die eine Restzeile auf die Folgeseite`, () => {
    // Seiten werden streng der Reihe nach gefüllt -- eine letzte Seite mit nur 1 Zeile ist in Ordnung.
    expect(groessen(macheZeilen(MAX_ZEILEN + 1))).toEqual([2, 1]);
  });

  it(`2*maxZeilen-1 (${2 * MAX_ZEILEN - 1}) Zeilen: erste Seite voll, Rest auf die Folgeseite`, () => {
    expect(groessen(macheZeilen(2 * MAX_ZEILEN - 1))).toEqual([2, 1]);
  });

  it(`2*maxZeilen (${2 * MAX_ZEILEN}) Zeilen: beide Seiten exakt voll`, () => {
    expect(groessen(macheZeilen(2 * MAX_ZEILEN))).toEqual([2, 2]);
  });

  it(`2*maxZeilen+1 (${2 * MAX_ZEILEN + 1}) Zeilen: dritte Seite trägt genau die eine Restzeile`, () => {
    expect(groessen(macheZeilen(2 * MAX_ZEILEN + 1))).toEqual([2, 2, 1]);
  });

  it('lässt keinen Platz auf einer Zwischenseite frei -- nur die letzte Seite darf angebrochen sein', () => {
    for (const anzahl of [3, 4, 5, 6, 7, 8, 9]) {
      const seiten = groessen(macheZeilen(anzahl));
      const bisVorletzte = seiten.slice(0, -1);
      expect(bisVorletzte.every(n => n === MAX_ZEILEN)).toBe(true);
      expect(seiten.reduce((a, b) => a + b, 0)).toBe(anzahl);
    }
  });

  it('Überlauf wiederholt die weitereSeite beliebig oft', () => {
    // 9 Zeilen, Kapazität pro Seite 2 -> erste(2) + weitere viermal (2+2+2+1).
    expect(groessen(macheZeilen(9))).toEqual([2, 2, 2, 2, 1]);
  });

  it('wirft, wenn Zeilen übrig bleiben und keine weitereSeite konfiguriert ist', () => {
    const kleinesLayout: Layout = { template: 'x', ersteSeite: macheSeite(0) };
    expect(() => verteile({ haupt: macheZeilen(3) }, kleinesLayout)).toThrow('1 Zeilen (haupt) passen in kein Layout');
  });

  it('behält die Zeilenreihenfolge über Seitenwechsel hinweg bei', () => {
    const zeilen = macheZeilen(5);
    const bloecke = verteile({ haupt: zeilen }, layout);
    const wiederhergestellt = bloecke.flatMap(b => b.zeilen.haupt ?? []);
    expect(wiederhergestellt).toEqual(zeilen);
  });
});
