import { describe, expect, it } from 'bun:test';
import type { Feld, Zeile } from '@otto-kirchheim/nebengeld-shared';
import { wert, type Kontext } from '@/infrastructure/pdf/wert';

const seiteZeilen: Zeile[] = [{ betrag: 10 }, { betrag: 5 }];
const bisherZeilen: Zeile[] = [{ betrag: 100 }, { betrag: 50 }];
const kontext: Kontext = { $seite: seiteZeilen, $bisher: bisherZeilen };

describe('wert', () => {
  it('liest einen Direktwert aus den Daten', () => {
    const f: Feld = { x: 0, y: 0, size: 10 };
    expect(wert(f, 'name', { name: 'Max' }, kontext)).toBe('Max');
  });

  it('formatiert einen Direktwert, wenn format gesetzt ist', () => {
    const f: Feld = { x: 0, y: 0, size: 10, format: 'waehrung' };
    expect(wert(f, 'betrag', { betrag: 1234.5 }, kontext)).toBe('1.234,50');
  });

  it('liefert leeren String für fehlende/null-Werte', () => {
    const f: Feld = { x: 0, y: 0, size: 10 };
    expect(wert(f, 'fehlt', {}, kontext)).toBe('');
    expect(wert(f, 'x', { x: null }, kontext)).toBe('');
  });

  it('summiert über $seite (Zwischensumme der aktuellen Seite)', () => {
    const f: Feld = {
      x: 0,
      y: 0,
      size: 10,
      format: 'waehrung',
      berechnet: { op: 'summe', ueber: '$seite', feld: 'betrag' },
    };
    expect(wert(f, 'zwischensumme', {}, kontext)).toBe('15,00');
  });

  it('summiert über $bisher (Übertrag der vorherigen Seiten)', () => {
    const f: Feld = {
      x: 0,
      y: 0,
      size: 10,
      format: 'waehrung',
      berechnet: { op: 'summe', ueber: '$bisher', feld: 'betrag' },
    };
    expect(wert(f, 'uebertrag', {}, kontext)).toBe('150,00');
  });

  it('$bisher ist leer auf der ersten Seite -- Übertrag ist 0', () => {
    const leererKontext: Kontext = { $seite: seiteZeilen, $bisher: [] };
    const f: Feld = {
      x: 0,
      y: 0,
      size: 10,
      format: 'waehrung',
      berechnet: { op: 'summe', ueber: '$bisher', feld: 'betrag' },
    };
    expect(wert(f, 'uebertrag', {}, leererKontext)).toBe('0,00');
  });

  it('summiert über einen Datenpfad (nicht $seite/$bisher)', () => {
    const f: Feld = {
      x: 0,
      y: 0,
      size: 10,
      format: 'waehrung',
      berechnet: { op: 'summe', ueber: 'zeilen', feld: 'betrag' },
    };
    const daten = { zeilen: [{ betrag: 7 }, { betrag: 3 }] };
    expect(wert(f, 'gesamt', daten, kontext)).toBe('10,00');
  });

  it('anzahl und max funktionieren über $seite', () => {
    const anzahl: Feld = { x: 0, y: 0, size: 10, berechnet: { op: 'anzahl', ueber: '$seite' } };
    const max: Feld = { x: 0, y: 0, size: 10, berechnet: { op: 'max', ueber: '$seite', feld: 'betrag' } };
    expect(wert(anzahl, 'n', {}, kontext)).toBe('2');
    expect(wert(max, 'm', {}, kontext)).toBe('10');
  });
});
