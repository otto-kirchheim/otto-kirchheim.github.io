import { describe, expect, it } from 'bun:test';
import {
  beAbgeleiteteWerte,
  bereitschaftszulageAbgeleiteteWerte,
  bzAbgeleiteteWerte,
} from '@/features/ber/model/pdfDaten';

describe('bzAbgeleiteteWerte', () => {
  it('berechnet Dauer in Minuten über Ende minus Beginn plus Pause', () => {
    const werte = bzAbgeleiteteWerte({
      Beginn: '2026-04-19T08:00:00.000Z',
      Ende: '2026-04-19T16:00:00.000Z',
      Pause: 30,
    });
    expect(werte.Dauer).toBe(510);
  });

  it('läuft über Tage, ohne Mitternachts-Korrektur', () => {
    const werte = bzAbgeleiteteWerte({
      Beginn: '2026-04-19T08:00:00.000Z',
      Ende: '2026-04-22T08:00:00.000Z',
      Pause: 0,
    });
    expect(werte.Dauer).toBe(4320);
  });

  it('addiert Pause auch bei kurzem Zeitraum, ohne zu deckeln', () => {
    const werte = bzAbgeleiteteWerte({
      Beginn: '2026-04-19T08:00:00.000Z',
      Ende: '2026-04-19T09:00:00.000Z',
      Pause: 90,
    });
    expect(werte.Dauer).toBe(150);
  });
});

describe('beAbgeleiteteWerte', () => {
  it('berechnet Dauer in Minuten über Ende minus Beginn', () => {
    expect(beAbgeleiteteWerte({ Beginn: '01:15', Ende: '02:00', PrivatKm: 0 }, 0).Dauer).toBe(45);
  });

  it('ergänzt über Mitternacht (Ende < Beginn)', () => {
    expect(beAbgeleiteteWerte({ Beginn: '23:00', Ende: '01:00', PrivatKm: 0 }, 0).Dauer).toBe(120);
  });

  it('berechnet PrivatKmBetrag über PrivatKm mal Satz', () => {
    expect(beAbgeleiteteWerte({ Beginn: '01:00', Ende: '02:00', PrivatKm: 12 }, 0.27).PrivatKmBetrag).toBe(3.24);
  });

  it('rundet auf 2 Nachkommastellen (Fließkomma-Rauschen, 13 * 0.27 === 3.5100000000000002)', () => {
    expect(beAbgeleiteteWerte({ Beginn: '01:00', Ende: '02:00', PrivatKm: 13 }, 0.27).PrivatKmBetrag).toBe(3.51);
  });

  it('liefert undefined ohne Privat-km', () => {
    expect(beAbgeleiteteWerte({ Beginn: '01:00', Ende: '02:00', PrivatKm: 0 }, 0.27).PrivatKmBetrag).toBeUndefined();
  });

  it('berechnet PrivatKmBetrag unabhängig -- welche Spalte (rohe km / Euro) gedruckt wird, entscheidet die Vorlage', () => {
    const werte = beAbgeleiteteWerte({ Beginn: '01:00', Ende: '02:00', PrivatKm: 12 }, 0.27);
    expect(werte).toEqual({ Dauer: 60, PrivatKmBetrag: 3.24 });
  });
});

describe('bereitschaftszulageAbgeleiteteWerte', () => {
  it('liefert nur TarifBeamter ohne Bereitschaftsminuten', () => {
    expect(bereitschaftszulageAbgeleiteteWerte(0, 'Tarifkraft', {})).toEqual({ TarifBeamter: 'Tarifkraft' });
    expect(bereitschaftszulageAbgeleiteteWerte(0, 'Besoldungsgruppe A 8', {})).toEqual({ TarifBeamter: 'Beamter' });
  });

  describe('TarifBeamter', () => {
    it('Tarifkraft bleibt Tarifkraft, jede Besoldungsgruppe wird zu Beamter', () => {
      expect(bereitschaftszulageAbgeleiteteWerte(0, 'Tarifkraft', {}).TarifBeamter).toBe('Tarifkraft');
      expect(bereitschaftszulageAbgeleiteteWerte(0, 'Besoldungsgruppe A 8', {}).TarifBeamter).toBe('Beamter');
      expect(bereitschaftszulageAbgeleiteteWerte(0, 'Besoldungsgruppe A 9', {}).TarifBeamter).toBe('Beamter');
    });
  });

  describe('Tarifkraft-Zweig', () => {
    it('SummeTarif = gerundete Stunden, keine Multiplikation mit einem Satz', () => {
      // Gegenprobe: dieselben 6000 Minuten wie in Berechnung.calculateBerechnungRows.test.ts
      // (dort bereitschaftMinuten: 6000, bereitschaftAnzeige: '100:00').
      const werte = bereitschaftszulageAbgeleiteteWerte(6000, 'Tarifkraft', {});
      expect(werte).toEqual({ TarifBeamter: 'Tarifkraft', BereitschaftsMinuten: 6000, SummeTarif: 100 });
    });

    it('rundet auf ganze Stunden', () => {
      expect(bereitschaftszulageAbgeleiteteWerte(6030, 'Tarifkraft', {}).SummeTarif).toBe(101);
      expect(bereitschaftszulageAbgeleiteteWerte(6029, 'Tarifkraft', {}).SummeTarif).toBe(100);
    });

    it('befüllt keine Beamter-Felder', () => {
      const werte = bereitschaftszulageAbgeleiteteWerte(6000, 'Tarifkraft', {});
      expect(werte.SummeBeamter1).toBeUndefined();
      expect(werte.SummeBeamter2).toBeUndefined();
      expect(werte.SummeBeamter3).toBeUndefined();
      expect(werte.GeldwertBeamter).toBeUndefined();
    });
  });

  describe('Beamter-Zweig', () => {
    it('Besoldungsgruppe A 8: Minus 600, geteilt durch 8 und 60, mal Satz', () => {
      const werte = bereitschaftszulageAbgeleiteteWerte(6000, 'Besoldungsgruppe A 8', {
        'Besoldungsgruppe A 8': 16.37,
      });
      // 6000 - 600 = 5400; 5400 / 8 / 60 = 11,25 -> 11; 11 * 16,37 = 180,07.
      expect(werte).toEqual({
        TarifBeamter: 'Beamter',
        BereitschaftsMinuten: 6000,
        SummeBeamter1: 5400,
        SummeBeamter2: 11,
        SummeBeamter3: 180.07,
        GeldwertBeamter: 16.37,
      });
    });

    it('Besoldungsgruppe A 9: eigener Satz, dynamische Schlüssel-Auswahl', () => {
      const werte = bereitschaftszulageAbgeleiteteWerte(6000, 'Besoldungsgruppe A 9', {
        'Besoldungsgruppe A 9': 22.49,
      });
      expect(werte).toEqual({
        TarifBeamter: 'Beamter',
        BereitschaftsMinuten: 6000,
        SummeBeamter1: 5400,
        SummeBeamter2: 11,
        SummeBeamter3: 247.39,
        GeldwertBeamter: 22.49,
      });
    });

    it('befüllt kein SummeTarif', () => {
      const werte = bereitschaftszulageAbgeleiteteWerte(6000, 'Besoldungsgruppe A 8', {
        'Besoldungsgruppe A 8': 16.37,
      });
      expect(werte.SummeTarif).toBeUndefined();
    });

    it('fehlender Satz in VorgabenGeld -> 0 statt NaN', () => {
      const werte = bereitschaftszulageAbgeleiteteWerte(6000, 'Besoldungsgruppe A 8', {});
      expect(werte.GeldwertBeamter).toBe(0);
      expect(werte.SummeBeamter3).toBe(0);
    });
  });
});
