import { describe, expect, it } from 'bun:test';
import { spaltenWert } from '@/infrastructure/pdf/spaltenWert';
import type { Spalte, Zeile } from '@otto-kirchheim/nebengeld-shared';

const zeile: Zeile = { dauer: 3, satz: 12.5, abzug: 2, text: 'Hallo' };

function spalte(over: Partial<Spalte>): Spalte {
  return { key: 'text', x: 10, size: 10, ...over };
}

describe('spaltenWert', () => {
  it('liest ohne berechnet den Direktwert aus der Zeile', () => {
    expect(spaltenWert(spalte({}), zeile)).toBe('Hallo');
  });

  it('liefert leeren String für fehlende Werte statt "undefined"', () => {
    expect(spaltenWert(spalte({ key: 'gibtsNicht' }), zeile)).toBe('');
  });

  it('produkt multipliziert die Operanden derselben Zeile', () => {
    expect(spaltenWert(spalte({ berechnet: { op: 'produkt', operanden: ['dauer', 'satz'] } }), zeile)).toBe('37.5');
  });

  it('mischt Feldnamen und feste Zahlen als Operanden', () => {
    expect(spaltenWert(spalte({ berechnet: { op: 'produkt', operanden: ['dauer', 2] } }), zeile)).toBe('6');
  });

  it('differenz zieht der Reihe nach ab', () => {
    expect(spaltenWert(spalte({ berechnet: { op: 'differenz', operanden: ['satz', 'abzug'] } }), zeile)).toBe('10.5');
  });

  it('quotient teilt der Reihe nach, Division durch 0 ergibt 0 statt Infinity', () => {
    expect(spaltenWert(spalte({ berechnet: { op: 'quotient', operanden: ['satz', 'dauer', 0] } }), zeile)).toBe('0');
  });

  it('nicht-numerische Operanden zählen als 0', () => {
    expect(spaltenWert(spalte({ berechnet: { op: 'summe', operanden: ['dauer', 'text'] } }), zeile)).toBe('3');
  });

  it('wendet das Format auf das Rechenergebnis an', () => {
    expect(spaltenWert(spalte({ format: 'waehrung', berechnet: { op: 'produkt', operanden: ['dauer', 'satz'] } }), zeile)).toBe('37,50');
  });

  it('verschachtelte Rechnung: BZ-Dauer als Ende − Beginn + Pause, formatiert als Zeitspanne', () => {
    const bz = { Beginn: '2026-03-02T16:00:00Z', Ende: '2026-03-05T06:00:00Z', Pause: 30 };
    const sp = spalte({
      format: 'stunden',
      berechnet: { op: 'summe', operanden: [{ op: 'zeitspanne', operanden: ['Ende', 'Beginn'] }, 'Pause'] },
    });
    expect(spaltenWert(sp, bz)).toBe('62:30');
  });
});
