import { describe, expect, it } from 'bun:test';
import { erzeugeDummyDaten } from '@/features/Admin/components/FormularEditor/dummyDaten';
import { trifftBedingung } from '@otto-kirchheim/nebengeld-shared';
import type { SeitenDef, Version, Zeile } from '@otto-kirchheim/nebengeld-shared';

function macheTabellen(): Version['tabellen'] {
  return { haupt: {
    quelle: 'zeilen',
    hoehe: 14,
    spalten: [
      { key: 'text', x: 50, size: 10 },
      { key: 'betrag', x: 200, size: 10, format: 'waehrung' },
    ],
  } };
}

function macheSeite(maxZeilen: number, wiederholt = false): SeitenDef {
  return {
    quelle: 0,
    ...(wiederholt ? { wiederholt: true } : {}),
    bereiche: [{ tabelle: 'haupt', startY: 700, maxZeilen }],
    felder: {
      name: { x: 50, y: 800, size: 12, label: 'Name' },
      summe: { x: 500, y: 60, size: 10, berechnet: { op: 'summe', ueber: '$alle', feld: 'betrag' } },
      datum: { x: 50, y: 20, size: 8, format: 'datum' },
    },
  };
}

describe('erzeugeDummyDaten', () => {
  it('übernimmt alle Spalten-Keys in jeder erzeugten Zeile', () => {
    const daten = erzeugeDummyDaten(macheTabellen(), [macheSeite(3)], 'ez');
    const zeilen = daten.zeilen as Record<string, unknown>[];
    expect(zeilen.length).toBeGreaterThan(0);
    for (const zeile of zeilen) {
      expect(zeile).toHaveProperty('text');
      expect(zeile).toHaveProperty('betrag');
    }
  });

  it('setzt nicht-berechnete Kopf-/Fuß-Felder als Wert am Datenpfad (Key), lässt berechnete aus', () => {
    const daten = erzeugeDummyDaten(macheTabellen(), [macheSeite(3)], 'ez');
    expect(daten).toHaveProperty('name');
    expect(daten).toHaveProperty('datum');
    expect(daten).not.toHaveProperty('summe');
  });

  it('ohne wiederholte Seite genau die Kapazität aller Seiten (kein Überlauf ohne Ziel-Seite)', () => {
    const daten = erzeugeDummyDaten(macheTabellen(), [macheSeite(5)], 'ez');
    expect((daten.zeilen as unknown[]).length).toBe(5);
  });

  it('mit wiederholter Seite genug Zeilen für Überlauf auf mindestens zwei Seiten', () => {
    const daten = erzeugeDummyDaten(macheTabellen(), [macheSeite(3), macheSeite(2, true)], 'ez');
    expect((daten.zeilen as unknown[]).length).toBe(3 + 2 + 1);
  });

  it('zählt den Platz aller Seiten zusammen, auch wenn keine wiederholt wird', () => {
    const daten = erzeugeDummyDaten(macheTabellen(), [macheSeite(3), macheSeite(2)], 'ez');
    expect((daten.zeilen as unknown[]).length).toBe(5);
  });

  it('befüllt auch Spalten, die es nur im Raster einer einzelnen Seite gibt', () => {
    const seite = macheSeite(2);
    seite.bereiche[0]!.spalten = [{ key: 'nurHier', x: 60, size: 10 }];
    const daten = erzeugeDummyDaten(macheTabellen(), [seite], 'ez');
    for (const zeile of daten.zeilen as Record<string, unknown>[]) {
      expect(zeile).toHaveProperty('nurHier');
      // Die Spalten der Tabelle bleiben daneben bestehen -- die Seite überschreibt nur die Anzeige.
      expect(zeile).toHaveProperty('text');
    }
  });

  it('unterstützt verschachtelte Datenpfade (Punkt-Notation)', () => {
    const tabellen = macheTabellen();
    const seite = macheSeite(2);
    seite.felder = { 'mitarbeiter.name': { x: 50, y: 800, size: 12 } };
    const daten = erzeugeDummyDaten(tabellen, [seite], 'ez');
    expect(daten.mitarbeiter).toBeDefined();
    expect((daten.mitarbeiter as Record<string, unknown>).name).toBeDefined();
  });

  it('erzeugt Listenwerte für dynamische Spalten -- je konfiguriertem Platz ein Schlüssel', () => {
    const tabellen = macheTabellen();
    tabellen.haupt!.listen = {
      ez: { quelle: 'Zulagen', schluessel: 'Typ', wert: 'Wert', auswahl: ['811', '818', '820'] },
    };
    tabellen.haupt!.spalten.push(
      { key: '', x: 300, size: 8, listenPlatz: { gruppe: 'ez', index: 0 } },
      { key: '', x: 330, size: 8, listenPlatz: { gruppe: 'ez', index: 1 } },
    );

    const daten = erzeugeDummyDaten(tabellen, [macheSeite(3)], 'ez');
    const zeilen = daten.zeilen as Record<string, unknown>[];
    const erste = zeilen[0]!.Zulagen as { Typ: string }[];

    // Erste Zeile trägt alle Plätze, damit in der Vorschau keine Spalte unbeschriftet bleibt.
    expect(erste.map(z => z.Typ)).toEqual(['811', '818']);
    // Nicht konfigurierte Schlüssel tauchen nicht auf -- sonst entstünde eine Geisterspalte.
    for (const zeile of zeilen) {
      const typen = (zeile.Zulagen as { Typ: string }[]).map(z => z.Typ);
      expect(typen.every(t => ['811', '818'].includes(t))).toBe(true);
    }
  });

  it('Ankreuz-Spalte mit bereich (statt werte) zeigt in der Vorschau abwechselnd Treffer und Nicht-Treffer, statt für jede Zeile leer zu bleiben (Boolean-Ankreuz-Bug, z.B. Wohnung8bis14 über {von:1,bis:2})', () => {
    const tabellen = macheTabellen();
    const wenn = { feld: 'aktiv', bereich: { von: 1, bis: 2 }, dann: 'X' };
    tabellen.haupt!.spalten.push({ key: 'kreuz', x: 400, size: 10, wenn });

    const daten = erzeugeDummyDaten(tabellen, [macheSeite(4)], 'ez');
    const zeilen = daten.zeilen as Zeile[];
    const treffer = zeilen.map(zeile => trifftBedingung(wenn, zeile));

    // Vorher: `zeile.aktiv` blieb roh `''`/`undefined` -- `alsVergleichswert` macht daraus immer 0,
    // das liegt nie in einem bereich mit `von: 1`, die Spalte war also für JEDE Zeile leer.
    expect(treffer).toContain(true);
    expect(treffer).toContain(false);
  });

  it('Ankreuz-Spalte mit werte: [true] (echter Boolean statt bereich-Umweg) zeigt ebenfalls beide Fälle in der Vorschau', () => {
    const tabellen = macheTabellen();
    const wenn = { feld: 'aktiv', werte: [true], dann: 'X' };
    tabellen.haupt!.spalten.push({ key: 'kreuz', x: 400, size: 10, wenn });

    const daten = erzeugeDummyDaten(tabellen, [macheSeite(4)], 'ez');
    const zeilen = daten.zeilen as Zeile[];
    const treffer = zeilen.map(zeile => trifftBedingung(wenn, zeile));

    expect(treffer).toContain(true);
    expect(treffer).toContain(false);
  });
});
