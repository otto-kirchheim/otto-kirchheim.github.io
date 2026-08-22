import { describe, expect, it } from 'bun:test';
import { verteile } from '@/infrastructure/pdf/verteile';
import type { Layout, SeitenDef, TabellenDef, Zeile } from '@otto-kirchheim/nebengeld-shared';

const MAX_ZEILEN = 2;

function macheSeite(quelle: number, extra: Partial<SeitenDef> = {}): SeitenDef {
  return { quelle, bereiche: [{ tabelle: 'haupt', startY: 700, maxZeilen: MAX_ZEILEN }], felder: {}, ...extra };
}

// Zwei Seiten: die erste einmalig (Kopf+Zeilen), die zweite bei Überlauf wiederholt.
const layout: Layout = {
  template: 'test.pdf',
  seiten: [macheSeite(0), macheSeite(1, { wiederholt: true })],
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

  it('Überlauf wiederholt die als wiederholt markierte Seite beliebig oft', () => {
    // 9 Zeilen, Kapazität pro Seite 2 -> erste(2) + wiederholte viermal (2+2+2+1).
    expect(groessen(macheZeilen(9))).toEqual([2, 2, 2, 2, 1]);
    expect(verteile({ haupt: macheZeilen(9) }, layout).map(b => b.def.quelle)).toEqual([0, 1, 1, 1, 1]);
  });

  it('wirft, wenn Zeilen übrig bleiben und keine Seite wiederholt wird', () => {
    const kleinesLayout: Layout = { template: 'x', seiten: [macheSeite(0)] };
    expect(() => verteile({ haupt: macheZeilen(3) }, kleinesLayout)).toThrow('keine Seite ist als wiederholt markiert');
  });

  it('wirft, wenn die wiederholte Seite für die Tabelle keinen Bereich hat', () => {
    const layoutOhneBereich: Layout = {
      template: 'x',
      seiten: [macheSeite(0), { quelle: 1, bereiche: [{ tabelle: 'andere', startY: 700, maxZeilen: 5 }], felder: {}, wiederholt: true }],
    };
    expect(() => verteile({ haupt: macheZeilen(3) }, layoutOhneBereich)).toThrow('Tabelle "haupt" hat auf keiner wiederholten Seite einen Bereich');
  });

  it('behält die Zeilenreihenfolge über Seitenwechsel hinweg bei', () => {
    const zeilen = macheZeilen(5);
    const bloecke = verteile({ haupt: zeilen }, layout);
    const wiederhergestellt = bloecke.flatMap(b => b.zeilen.haupt ?? []);
    expect(wiederhergestellt).toEqual(zeilen);
  });
});

describe('verteile – mehrere unterschiedliche Seiten (Bereitschaft)', () => {
  // Seite 1: BZ-Zeiträume. Seite 2: Einsätze LRE 1+2. Seite 3: Einsätze LRE 3, wiederholt.
  const bereitschaft: Layout = {
    template: 'b.pdf',
    seiten: [
      { quelle: 0, bereiche: [{ tabelle: 'bz', startY: 700, maxZeilen: 3 }], felder: {} },
      { quelle: 1, bereiche: [{ tabelle: 'be12', startY: 700, maxZeilen: 2 }], felder: {} },
      { quelle: 2, bereiche: [{ tabelle: 'be3', startY: 700, maxZeilen: 2 }], felder: {}, wiederholt: true },
    ],
  };

  it('lässt Seiten weg, deren Tabellen keine Zeilen haben', () => {
    const bloecke = verteile({ bz: macheZeilen(2), be12: [], be3: [] }, bereitschaft);
    expect(bloecke.map(b => b.def.quelle)).toEqual([0]);
  });

  it('nimmt die BE-Seite nur bei vorhandenen Einsätzen dazu', () => {
    const bloecke = verteile({ bz: macheZeilen(1), be12: macheZeilen(1), be3: [] }, bereitschaft);
    expect(bloecke.map(b => b.def.quelle)).toEqual([0, 1]);
  });

  it('wiederholt nur die letzte Seite, die anderen bleiben einmalig', () => {
    const bloecke = verteile({ bz: macheZeilen(1), be12: macheZeilen(1), be3: macheZeilen(5) }, bereitschaft);
    expect(bloecke.map(b => b.def.quelle)).toEqual([0, 1, 2, 2, 2]);
    expect(bloecke.map(b => (b.zeilen.be3 ?? []).length)).toEqual([0, 0, 2, 2, 1]);
  });

  it('rendert eine Seite ohne Datentabelle immer (reine Text-/Unterschriftsseite)', () => {
    const mitAbschluss: Layout = {
      template: 'x',
      seiten: [macheSeite(0, { wiederholt: true }), { quelle: 5, bereiche: [], felder: {} }],
    };
    const bloecke = verteile({ haupt: macheZeilen(3) }, mitAbschluss);
    // Die wiederholte Seite kommt komplett VOR der Abschlussseite, nicht dazwischen.
    expect(bloecke.map(b => b.def.quelle)).toEqual([0, 0, 5]);
  });
});

describe('verteile – maxZeilen als Seiten-Override (EA-artig: gleiche Kapazität, andere Spalten)', () => {
  function macheTabelle(maxZeilen: number): Record<string, TabellenDef> {
    return { haupt: { quelle: 'zeilen', startY: 700, maxZeilen, hoehe: 14, spalten: [] } };
  }

  it('nutzt die Kapazität der Tabelle, wenn der Bereich selbst keine eigene setzt', () => {
    const seite: SeitenDef = { quelle: 0, bereiche: [{ tabelle: 'haupt' }], felder: {} };
    const bloecke = verteile({ haupt: macheZeilen(3) }, { template: 'x', seiten: [seite] }, macheTabelle(3));
    expect(bloecke.map(b => (b.zeilen.haupt ?? []).length)).toEqual([3]);
  });

  it('das eigene maxZeilen des Bereichs hat Vorrang vor dem globalen Wert der Tabelle', () => {
    const seiten: SeitenDef[] = [
      { quelle: 0, bereiche: [{ tabelle: 'haupt', maxZeilen: 1 }], felder: {} },
      { quelle: 1, bereiche: [{ tabelle: 'haupt' }], felder: {}, wiederholt: true },
    ];
    const bloecke = verteile({ haupt: macheZeilen(3) }, { template: 'x', seiten }, macheTabelle(5));
    // Seite 1 nimmt trotz globaler Kapazität 5 nur 1 Zeile (eigener Override); die wiederholte
    // Seite 2 erbt die globalen 5 und nimmt den Rest komplett auf.
    expect(bloecke.map(b => (b.zeilen.haupt ?? []).length)).toEqual([1, 2]);
  });
});
