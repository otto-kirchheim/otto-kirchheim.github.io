import { describe, expect, it } from 'bun:test';
import { tabellenZeilen } from '@/infrastructure/pdf/tabellenZeilen';
import { FORMAT, OPS } from '@/infrastructure/pdf/aggregatoren';
import type { Daten, TabellenDef } from '@otto-kirchheim/nebengeld-shared';

const daten: Daten = {
  Daten: {
    BE: [
      { Tag: '2026-03-02', Beginn: '18:00', Ende: '20:30', LRE: 'LRE 1' },
      { Tag: '2026-03-03', Beginn: '22:00', Ende: '01:15', LRE: 'LRE 2' },
      { Tag: '2026-03-09', Beginn: '10:00', Ende: '12:45', LRE: 'LRE 3' },
    ],
  },
};

const mitDauer: TabellenDef = {
  quelle: 'Daten.BE',
  startY: 700,
  maxZeilen: 10,
  hoehe: 14,
  spalten: [
    { key: 'Tag', x: 50, size: 9 },
    { key: 'Dauer', x: 200, size: 9, format: 'stunden', berechnet: { op: 'zeitdifferenz', operanden: ['Ende', 'Beginn'] } },
  ],
};

describe('tabellenZeilen', () => {
  it('wendet den Filter an', () => {
    const nurLre3: TabellenDef = { ...mitDauer, filter: { feld: 'LRE', werte: ['LRE 3'] } };
    expect(tabellenZeilen(daten, nurLre3)).toHaveLength(1);
  });

  it('legt den Wert berechneter Spalten unter deren Key in die Zeile', () => {
    const zeilen = tabellenZeilen(daten, mitDauer);
    // 18:00 -> 20:30 = 150 Minuten, 22:00 -> 01:15 ueber Mitternacht = 195.
    expect(zeilen.map(z => z.Dauer)).toEqual([150, 195, 165]);
  });

  it('eine Summe ueber eine berechnete Spalte findet dadurch Werte statt 0', () => {
    const zeilen = tabellenZeilen(daten, mitDauer);
    expect(FORMAT.stunden(OPS.summe(zeilen, 'Dauer'))).toBe('8:30');
  });

  it('laesst die Nutzdaten unangetastet -- die Zeile wird kopiert', () => {
    tabellenZeilen(daten, mitDauer);
    const roh = (daten.Daten as { BE: Record<string, unknown>[] }).BE[0]!;
    expect(roh).not.toHaveProperty('Dauer');
  });

  it('ohne berechnete Spalten bleiben die Originalzeilen erhalten (keine unnoetige Kopie)', () => {
    const schlicht: TabellenDef = { quelle: 'Daten.BE', startY: 700, maxZeilen: 10, hoehe: 14, spalten: [{ key: 'Tag', x: 50, size: 9 }] };
    const roh = (daten.Daten as { BE: Record<string, unknown>[] }).BE[0]!;
    expect(tabellenZeilen(daten, schlicht)[0]).toBe(roh as never);
  });

  it('Ankreuz-Spalten fuellen ihr Ergebnis (das gedruckte Zeichen, sonst leer) in die Zeile', () => {
    const ankreuz: TabellenDef = {
      quelle: 'Daten.BE',
      startY: 700,
      maxZeilen: 10,
      hoehe: 14,
      spalten: [{ key: 'LRE1', x: 50, size: 9, wenn: { feld: 'LRE', werte: ['LRE 1'], dann: 'X' } }],
    };
    const zeilen = tabellenZeilen(daten, ankreuz);
    expect(zeilen.map(z => z.LRE1)).toEqual(['X', '', '']);
  });

  it('mit numerischem "dann" zaehlt eine Summe ueber eine Ankreuz-Spalte die zutreffenden Zeilen', () => {
    const ankreuz: TabellenDef = {
      quelle: 'Daten.BE',
      startY: 700,
      maxZeilen: 10,
      hoehe: 14,
      spalten: [{ key: 'LRE1', x: 50, size: 9, wenn: { feld: 'LRE', werte: ['LRE 1', 'LRE 2'], dann: '1' } }],
    };
    const zeilen = tabellenZeilen(daten, ankreuz);
    // '' zaehlt ueber alsZahl als 0, '1' als 1 -- die Summe ist damit die Anzahl der Treffer.
    expect(OPS.summe(zeilen, 'LRE1')).toBe(2);
  });

  it('eine Ankreuz-Spalte mit berechnetem Wert und Wertebereich fuellt ihr Ergebnis ebenso in die Zeile', () => {
    const ankreuzBereich: TabellenDef = {
      quelle: 'Daten.BE',
      startY: 700,
      maxZeilen: 10,
      hoehe: 14,
      spalten: [{ key: 'lang', x: 50, size: 9, wenn: { berechnet: { op: 'zeitdifferenz', operanden: ['Ende', 'Beginn'] }, bereich: { von: 150, bis: 200 }, dann: '1' } }],
    };
    const zeilen = tabellenZeilen(daten, ankreuzBereich);
    // Dauern: 150, 195, 165 -- alle drei liegen in [150, 200).
    expect(zeilen.map(z => z.lang)).toEqual(['1', '1', '1']);
  });
});
