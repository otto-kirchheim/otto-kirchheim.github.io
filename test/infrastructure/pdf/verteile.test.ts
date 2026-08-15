import { describe, expect, it } from 'bun:test';
import { verteile } from '@/infrastructure/pdf/verteile';
import type { Layout, SeitenDef, Zeile } from '@otto-kirchheim/nebengeld-shared';

const MAX_ZEILEN = 2;

function macheSeite(quelle: number): SeitenDef {
  return { quelle, maxZeilen: MAX_ZEILEN, startY: 700, kopf: {} };
}

// 3 Seiten wie im Konzept: Kopf+Zeilen / Kennzeile+Zeilen (wiederholt) / Kennzeile+Zeilen+Fuß.
const layout: Layout = {
  template: 'test.pdf',
  seiten: [macheSeite(0), macheSeite(1), macheSeite(2)],
  wiederholSeite: 1,
};

function macheZeilen(anzahl: number): Zeile[] {
  return Array.from({ length: anzahl }, (_, i) => ({ text: `Zeile ${i + 1}` }));
}

function groessen(zeilen: Zeile[]): number[] {
  return verteile(zeilen, layout).map(b => b.zeilen.length);
}

describe('verteile', () => {
  it('0 Zeilen: jede Seite wird trotzdem einmal erzeugt, alle leer', () => {
    expect(groessen(macheZeilen(0))).toEqual([0, 0, 0]);
  });

  it('1 Zeile: passt komplett auf die erste Seite', () => {
    expect(groessen(macheZeilen(1))).toEqual([1, 0, 0]);
  });

  it(`maxZeilen (${MAX_ZEILEN}) Zeilen: füllt genau die erste Seite`, () => {
    expect(groessen(macheZeilen(MAX_ZEILEN))).toEqual([2, 0, 0]);
  });

  it(`maxZeilen+1 (${MAX_ZEILEN + 1}) Zeilen: erste Seite voll, Rest auf Seite 2`, () => {
    expect(groessen(macheZeilen(MAX_ZEILEN + 1))).toEqual([2, 1, 0]);
  });

  it(`2*maxZeilen-1 (${2 * MAX_ZEILEN - 1}) Zeilen: identisch zu maxZeilen+1 bei diesem Layout`, () => {
    expect(groessen(macheZeilen(2 * MAX_ZEILEN - 1))).toEqual([2, 1, 0]);
  });

  it(`2*maxZeilen+1 (${2 * MAX_ZEILEN + 1}) Zeilen: Waisenzeilen-Schutz greift (1 Zeile von Seite 2 geliehen)`, () => {
    // Ohne Schutz wäre die Verteilung [2, 2, 1] -- Abschlussseite mit nur 1 Zeile.
    expect(groessen(macheZeilen(2 * MAX_ZEILEN + 1))).toEqual([2, 1, 2]);
  });

  it('Überlauf über die reguläre 3-Seiten-Kapazität hinaus wiederholt die wiederholSeite mehrfach', () => {
    // 9 Zeilen, Kapazität pro Seite 2 -> Seite1(2) + Seite2 dreifach(2+2+2) + Abschluss(1),
    // danach greift der Waisenzeilen-Schutz.
    expect(groessen(macheZeilen(9))).toEqual([2, 2, 2, 1, 2]);
  });

  it('wirft, wenn Zeilen in kein Layout passen', () => {
    const kleinesLayout: Layout = { template: 'x', seiten: [macheSeite(0)] };
    expect(() => verteile(macheZeilen(3), kleinesLayout)).toThrow('1 Zeilen passen in kein Layout');
  });

  it('behält die Zeilenreihenfolge über Seitenwechsel und Waisenzeilen-Schutz hinweg bei', () => {
    const zeilen = macheZeilen(5);
    const bloecke = verteile(zeilen, layout);
    const wiederhergestellt = bloecke.flatMap(b => b.zeilen);
    expect(wiederhergestellt).toEqual(zeilen);
  });
});
