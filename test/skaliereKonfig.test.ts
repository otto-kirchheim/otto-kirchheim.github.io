import { describe, expect, it } from 'bun:test';
import { skaliereKonfig } from '@/features/Admin/components/FormularEditor/skaliereKonfig';
import type { Konfig } from '@/features/Admin/components/FormularEditor/FormularEditor';

function beispielKonfig(): Konfig {
  return {
    seiten: [
      {
        quelle: 0,
        groesse: { w: 595, h: 842 },
        felder: {
          name: { x: 100, y: 700, x2: 300, y2: 720, size: 10 },
          punkt: { x: 50, y: 50, size: 8 },
        },
        signaturBild: { x: 400, y: 60, w: 120, h: 40 },
        bereiche: [
          {
            tabelle: 'haupt',
            startY: 650,
            hoehe: 14,
            sonderzeilen: [{ name: 'summe', y: 120, y2: 134 }],
          },
        ],
      },
    ],
    tabellen: {
      haupt: {
        quelle: 'Daten.BE',
        startY: 650,
        maxZeilen: 20,
        hoehe: 14,
        spalten: [{ key: 'a', x: 60, x2: 120, size: 8, maxBreite: 55 }],
        sonderzeilen: { summe: { zellen: [{ spaltenIndex: 0, art: 'summe', size: 9 }] } },
      },
    },
  };
}

const F1 = { x: 1, y: 1, dx: 0, dy: 0 };

describe('skaliereKonfig', () => {
  it('lässt bei Faktor 1 / Versatz 0 alles unverändert', () => {
    const k = beispielKonfig();
    expect(skaliereKonfig(k, F1)).toEqual(k);
  });

  it('lässt die Eingabe unberührt (reine Funktion)', () => {
    const k = beispielKonfig();
    const vorher = structuredClone(k);
    skaliereKonfig(k, { x: 1.5, y: 0.5, dx: 10, dy: -5 });
    expect(k).toEqual(vorher);
  });

  it('skaliert x-Werte mit f.x, y-Werte und Größen mit f.y', () => {
    const s = skaliereKonfig(beispielKonfig(), { x: 2, y: 0.5, dx: 0, dy: 0 }).seiten[0]!;
    expect(s.felder.name).toEqual({ x: 200, y: 350, x2: 600, y2: 360, size: 5 });
    expect(s.felder.punkt).toEqual({ x: 100, y: 25, size: 4 });
    expect(s.signaturBild).toEqual({ x: 800, y: 30, w: 240, h: 20 });
    expect(s.bereiche[0]).toEqual({
      tabelle: 'haupt',
      startY: 325,
      hoehe: 7,
      sonderzeilen: [{ name: 'summe', y: 60, y2: 67 }],
    });
  });

  it('verschiebt Koordinaten um dx/dy, Abstände/Größen bleiben unversetzt', () => {
    const s = skaliereKonfig(beispielKonfig(), { x: 1, y: 1, dx: 10, dy: -20 }).seiten[0]!;
    expect(s.felder.name).toEqual({ x: 110, y: 680, x2: 310, y2: 700, size: 10 });
    expect(s.signaturBild).toEqual({ x: 410, y: 40, w: 120, h: 40 });
    expect(s.bereiche[0]!.startY).toBe(630);
    expect(s.bereiche[0]!.hoehe).toBe(14);
  });

  it('kombiniert Skalierung und Versatz: wert * faktor + versatz', () => {
    const s = skaliereKonfig(beispielKonfig(), { x: 2, y: 0.5, dx: 5, dy: 3 }).seiten[0]!;
    expect(s.felder.name).toEqual({ x: 205, y: 353, x2: 605, y2: 363, size: 5 });
  });

  it('skaliert Tabellen-Spalten, -Höhe und Sonderzeilen-Größen', () => {
    const t = skaliereKonfig(beispielKonfig(), { x: 2, y: 0.5, dx: 0, dy: 0 }).tabellen.haupt!;
    expect(t.startY).toBe(325);
    expect(t.hoehe).toBe(7);
    expect(t.spalten[0]).toEqual({ key: 'a', x: 120, x2: 240, size: 4, maxBreite: 110 });
    expect(t.sonderzeilen!.summe!.zellen[0]!.size).toBe(4.5);
  });

  it('schreibt die neue Seitengröße in jede Seite', () => {
    const s = skaliereKonfig(beispielKonfig(), { x: 1.03, y: 0.94, dx: 0, dy: 0 }, { w: 612, h: 792 }).seiten[0]!;
    expect(s.groesse).toEqual({ w: 612, h: 792 });
  });
});
