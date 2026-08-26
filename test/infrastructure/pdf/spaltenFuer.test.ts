import { describe, expect, it } from 'bun:test';
import { hoeheFuer, maxZeilenFuer, spaltenFuer, startYFuer } from '@/infrastructure/pdf/spaltenFuer';
import type { Spalte, TabellenBereich, TabellenDef } from '@otto-kirchheim/nebengeld-shared';

const tabelle: TabellenDef = {
  quelle: 'zeilen',
  startY: 500,
  maxZeilen: 8,
  hoehe: 14,
  spalten: [
    { key: 'text', x: 50, size: 10 },
    { key: 'betrag', x: 200, size: 10 },
  ],
};

const bereich: TabellenBereich = { tabelle: 'haupt' };

describe('spaltenFuer', () => {
  it('nimmt die Spalten der Tabelle, solange die Seite keine eigenen hat', () => {
    expect(spaltenFuer(bereich, tabelle)).toBe(tabelle.spalten);
  });

  it('nimmt die Spalten der Seite, sobald sie gesetzt sind (abweichendes Raster auf Folgeseiten)', () => {
    const eigene: Spalte[] = [{ key: 'text', x: 80, x2: 300, size: 9 }];
    expect(spaltenFuer({ ...bereich, spalten: eigene }, tabelle)).toBe(eigene);
  });

  it('ein leeres Spaltenfeld der Seite bedeutet „keine Spalten", nicht „die der Tabelle"', () => {
    expect(spaltenFuer({ ...bereich, spalten: [] }, tabelle)).toEqual([]);
  });
});

describe('hoeheFuer', () => {
  it('nimmt die Höhe der Tabelle, solange die Seite keine eigene hat', () => {
    expect(hoeheFuer(bereich, tabelle)).toBe(14);
  });

  it('nimmt die Höhe der Seite, sobald sie gesetzt ist (abweichender Zeilenabstand auf Folgeseiten)', () => {
    expect(hoeheFuer({ ...bereich, hoehe: 20 }, tabelle)).toBe(20);
  });
});

describe('startYFuer', () => {
  it('nimmt die Startposition der Tabelle, solange die Seite keine eigene hat', () => {
    expect(startYFuer(bereich, tabelle)).toBe(500);
  });

  it('nimmt die Startposition der Seite, sobald sie gesetzt ist', () => {
    expect(startYFuer({ ...bereich, startY: 700 }, tabelle)).toBe(700);
  });
});

describe('maxZeilenFuer', () => {
  it('nimmt die Zeilenzahl der Tabelle, solange die Seite keine eigene hat', () => {
    expect(maxZeilenFuer(bereich, tabelle)).toBe(8);
  });

  it('nimmt die Zeilenzahl der Seite, sobald sie gesetzt ist', () => {
    expect(maxZeilenFuer({ ...bereich, maxZeilen: 5 }, tabelle)).toBe(5);
  });
});
