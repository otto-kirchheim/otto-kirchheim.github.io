import { describe, expect, it } from 'bun:test';
import type { Feld, Zeile } from '@otto-kirchheim/nebengeld-shared';
import { wert, type Kontext } from '@/infrastructure/pdf/wert';

const seiteZeilen: Zeile[] = [{ betrag: 10 }, { betrag: 5 }];
const bisherZeilen: Zeile[] = [{ betrag: 100 }, { betrag: 50 }];
const alleZeilen: Zeile[] = [...bisherZeilen, ...seiteZeilen];
const kontext: Kontext = { $seite: { haupt: seiteZeilen }, $bisher: { haupt: bisherZeilen }, $alle: { haupt: alleZeilen }, seite: 2, seiten: 3 };

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

  it('fester text schlägt den Datenpfad -- Beschriftung der Übertragszeile', () => {
    const f: Feld = { x: 0, y: 0, size: 10, text: 'Übertrag' };
    expect(wert(f, 'name', { name: 'Max' }, kontext)).toBe('Übertrag');
  });

  describe('Platzhalter im festen Text', () => {
    it('{seite}/{seiten} liefern die Seitenzahlen -- so entsteht die Seitenzahl-Zelle', () => {
      const f: Feld = { x: 0, y: 0, size: 10, text: 'Seite {seite} von {seiten}' };
      expect(wert(f, 'egal', {}, kontext)).toBe('Seite 2 von 3');
    });

    it('beliebige Datenpfade sind ebenfalls als Platzhalter nutzbar', () => {
      const f: Feld = { x: 0, y: 0, size: 10, text: 'Zulagen {Monat}/{Jahr} für {p.Vorname}' };
      expect(wert(f, 'egal', { Monat: 3, Jahr: 2026, p: { Vorname: 'Max' } }, kontext)).toBe('Zulagen 3/2026 für Max');
    });

    it('unbekannte Platzhalter werden zu leerem Text, nicht roh ins PDF übernommen', () => {
      const f: Feld = { x: 0, y: 0, size: 10, text: 'A{gibtsNicht}B' };
      expect(wert(f, 'egal', {}, kontext)).toBe('AB');
    });

    it('Text ohne Platzhalter bleibt unverändert', () => {
      const f: Feld = { x: 0, y: 0, size: 10, text: 'Übertrag' };
      expect(wert(f, 'egal', {}, kontext)).toBe('Übertrag');
    });
  });

  it('summiert über $alle (Gesamtsumme des Dokuments, unabhängig von der Seite)', () => {
    const f: Feld = { x: 0, y: 0, size: 10, format: 'waehrung', berechnet: { op: 'summe', ueber: '$alle', feld: 'betrag' } };
    expect(wert(f, 'gesamt', {}, kontext)).toBe('165,00');
  });

  describe('zusammengesetzte Felder (quellen + trenner)', () => {
    const daten = { p: { Nachname: 'Mustermann', Vorname: 'Max', Adress1: 'Bahnweg 1', Adress2: '', Ort: '12345 Berlin' } };

    it('verbindet mehrere Datenpfade mit dem konfigurierten Trenner', () => {
      const f: Feld = { x: 0, y: 0, size: 10, quellen: ['p.Nachname', 'p.Vorname'], trenner: ', ' };
      expect(wert(f, 'egal', daten, kontext)).toBe('Mustermann, Max');
    });

    it('überspringt leere und fehlende Teile, statt doppelte Trennzeichen zu hinterlassen', () => {
      const f: Feld = { x: 0, y: 0, size: 10, quellen: ['p.Adress1', 'p.Adress2', 'p.fehlt', 'p.Ort'], trenner: ' / ' };
      expect(wert(f, 'egal', daten, kontext)).toBe('Bahnweg 1 / 12345 Berlin');
    });

    it('ohne trenner wird mit Leerzeichen verbunden', () => {
      const f: Feld = { x: 0, y: 0, size: 10, quellen: ['p.Vorname', 'p.Nachname'] };
      expect(wert(f, 'egal', daten, kontext)).toBe('Max Mustermann');
    });

    it('das Format gilt für jeden Teil einzeln (z.B. zwei Datumswerte als Zeitraum)', () => {
      const f: Feld = { x: 0, y: 0, size: 10, quellen: ['von', 'bis'], trenner: ' - ', format: 'datum' };
      expect(wert(f, 'egal', { von: '2026-03-01', bis: '2026-03-05' }, kontext)).toBe('01.03.2026 - 05.03.2026');
    });

    it('quellen schlagen berechnet, aber nicht den festen text', () => {
      const beides: Feld = { x: 0, y: 0, size: 10, text: 'fest', quellen: ['p.Vorname'] };
      expect(wert(beides, 'egal', daten, kontext)).toBe('fest');
    });

    it('leere Quellenliste ergibt einen leeren String, keinen Absturz', () => {
      const f: Feld = { x: 0, y: 0, size: 10, quellen: [], trenner: ', ' };
      expect(wert(f, 'egal', daten, kontext)).toBe('');
    });
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
    const leererKontext: Kontext = { $seite: { haupt: seiteZeilen }, $bisher: {}, $alle: { haupt: seiteZeilen }, seite: 1, seiten: 1 };
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
