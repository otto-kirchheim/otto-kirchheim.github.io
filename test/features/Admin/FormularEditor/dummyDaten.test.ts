import { describe, expect, it } from 'bun:test';
import { erzeugeDummyDaten } from '@/features/Admin/components/FormularEditor/dummyDaten';
import type { SeitenDef, Version } from '@otto-kirchheim/nebengeld-shared';

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

function macheSeite(maxZeilen: number): SeitenDef {
  return {
    quelle: 0,
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
    const daten = erzeugeDummyDaten(macheTabellen(), macheSeite(3), undefined);
    const zeilen = daten.zeilen as Record<string, unknown>[];
    expect(zeilen.length).toBeGreaterThan(0);
    for (const zeile of zeilen) {
      expect(zeile).toHaveProperty('text');
      expect(zeile).toHaveProperty('betrag');
    }
  });

  it('setzt nicht-berechnete Kopf-/Fuß-Felder als Wert am Datenpfad (Key), lässt berechnete aus', () => {
    const daten = erzeugeDummyDaten(macheTabellen(), macheSeite(3), undefined);
    expect(daten).toHaveProperty('name');
    expect(daten).toHaveProperty('datum');
    expect(daten).not.toHaveProperty('summe');
  });

  it('ohne weitereSeite genau ersteSeite.maxZeilen Zeilen (kein Überlauf ohne Ziel-Seite)', () => {
    const daten = erzeugeDummyDaten(macheTabellen(), macheSeite(5), undefined);
    expect((daten.zeilen as unknown[]).length).toBe(5);
  });

  it('mit weitereSeite genug Zeilen für Überlauf auf mindestens zwei Seiten', () => {
    const daten = erzeugeDummyDaten(macheTabellen(), macheSeite(3), macheSeite(2));
    expect((daten.zeilen as unknown[]).length).toBe(3 + 2 + 1);
  });

  it('unterstützt verschachtelte Datenpfade (Punkt-Notation)', () => {
    const tabellen = macheTabellen();
    const seite = macheSeite(2);
    seite.felder = { 'mitarbeiter.name': { x: 50, y: 800, size: 12 } };
    const daten = erzeugeDummyDaten(tabellen, seite, undefined);
    expect(daten.mitarbeiter).toBeDefined();
    expect((daten.mitarbeiter as Record<string, unknown>).name).toBeDefined();
  });
});
