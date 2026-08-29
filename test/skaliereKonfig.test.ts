import { describe, expect, it } from 'bun:test';
import { dreheKonfig, skaliereKonfig } from '@/features/Admin/components/FormularEditor/skaliereKonfig';
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

const A4 = { w: 595, h: 842 };

describe('dreheKonfig', () => {
  it('lässt bei 0° alles unverändert (tiefe Kopie)', () => {
    const k = beispielKonfig();
    expect(dreheKonfig(k, 0, A4)).toEqual(k);
  });

  it('lässt die Eingabe unberührt (reine Funktion)', () => {
    const k = beispielKonfig();
    const vorher = structuredClone(k);
    dreheKonfig(k, 90, A4);
    expect(k).toEqual(vorher);
  });

  it('dreht Felder und Signatur um 90° um den Seitenmittelpunkt und tauscht die Referenzgröße', () => {
    const s = dreheKonfig(beispielKonfig(), 90, A4).seiten[0]!;
    expect(s.felder.name).toEqual({ x: 142, y: 100, x2: 122, y2: 300, size: 10, drehung: 90 });
    expect(s.felder.punkt).toEqual({ x: 792, y: 50, size: 8, drehung: 90 });
    expect(s.signaturBild).toEqual({ x: 742, y: 400, w: 40, h: 120 });
    expect(s.groesse).toEqual({ w: 842, h: 595 });
  });

  it('dreht bei 180° ohne Breite/Höhe-Tausch', () => {
    const s = dreheKonfig(beispielKonfig(), 180, A4).seiten[0]!;
    expect(s.felder.name).toEqual({ x: 495, y: 142, x2: 295, y2: 122, size: 10, drehung: 180 });
    expect(s.signaturBild).toEqual({ x: 75, y: 742, w: 120, h: 40 });
    expect(s.groesse).toEqual({ w: 595, h: 842 });
  });

  it('setzt nur TabellenDef.drehung -- startY/hoehe/spalten bleiben aufrecht', () => {
    const vorher = beispielKonfig();
    const k = dreheKonfig(vorher, 90, A4);
    expect(k.tabellen.haupt!.drehung).toBe(90);
    expect(k.tabellen.haupt!.startY).toBe(vorher.tabellen.haupt!.startY);
    expect(k.tabellen.haupt!.hoehe).toBe(vorher.tabellen.haupt!.hoehe);
    expect(k.tabellen.haupt!.spalten).toEqual(vorher.tabellen.haupt!.spalten);
  });

  it('zählt eine bestehende drehung mit und entfernt sie beim vollen Umlauf', () => {
    const k = beispielKonfig();
    k.seiten[0]!.felder.name!.drehung = 270;
    k.tabellen.haupt!.drehung = 270;
    const gedreht = dreheKonfig(k, 90, A4).seiten[0]!;
    expect(gedreht.felder.name!.drehung).toBeUndefined();
    // 270 + 90 = 360 -> 0 -> undefined
  });
});
