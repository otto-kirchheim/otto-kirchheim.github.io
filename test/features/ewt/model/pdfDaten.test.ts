import { describe, expect, it } from 'bun:test';
import { ewtAbgeleiteteWerte } from '@/features/ewt/model/pdfDaten';

describe('ewtAbgeleiteteWerte', () => {
  it('berechnet DauerWohnung/DauerErsteTkgSt als HH:mm-Zeitspanne', () => {
    const werte = ewtAbgeleiteteWerte({ abWE: '06:00', anWE: '15:30', ab1E: '07:00', an1E: '16:00' }, false);
    expect(werte.DauerWohnung).toBe('9:30');
    expect(werte.DauerErsteTkgSt).toBe('9:00');
  });

  it('ergänzt über Mitternacht (Ende < Beginn)', () => {
    const werte = ewtAbgeleiteteWerte({ abWE: '22:00', anWE: '02:00', ab1E: undefined, an1E: undefined }, false);
    expect(werte.DauerWohnung).toBe('4:00');
  });

  it('liefert 0:00 und alle Booleans false, wenn ein Zeitpunkt fehlt', () => {
    const nurAb = ewtAbgeleiteteWerte({ abWE: '06:00', anWE: undefined, ab1E: undefined, an1E: undefined }, true);
    expect(nurAb.DauerWohnung).toBe('0:00');
    expect(nurAb.Wohnung8bis14).toBe(false);
    expect(nurAb.BeamterUeber8Wohnung).toBe(false);

    const beide = ewtAbgeleiteteWerte({ abWE: undefined, anWE: undefined, ab1E: undefined, an1E: undefined }, false);
    expect(beide.DauerWohnung).toBe('0:00');
  });

  describe('Wohnung-Zeitbänder (untere Grenze exklusiv, obere Grenze inklusiv)', () => {
    const werteFuer = (dauer: string) =>
      ewtAbgeleiteteWerte({ abWE: '00:00', anWE: dauer, ab1E: undefined, an1E: undefined }, false);

    it('genau 8h liegt in KEINEM Band (untere Grenze exklusiv)', () => {
      const w = werteFuer('08:00');
      expect(w.Wohnung8bis14).toBe(false);
      expect(w.Wohnung14bis24).toBe(false);
      expect(w.WohnungUeber24).toBe(false);
    });

    it('8h01 liegt im 8-14h-Band', () => {
      expect(werteFuer('08:01').Wohnung8bis14).toBe(true);
    });

    it('genau 14h liegt noch im 8-14h-Band (obere Grenze inklusiv)', () => {
      const w = werteFuer('14:00');
      expect(w.Wohnung8bis14).toBe(true);
      expect(w.Wohnung14bis24).toBe(false);
    });

    it('14h01 liegt im 14-24h-Band', () => {
      expect(werteFuer('14:01').Wohnung14bis24).toBe(true);
    });

    it('über 24h braucht einen Tageswechsel -- 23:59 ab 00:00 liegt noch im 14-24h-Band', () => {
      expect(werteFuer('23:59').Wohnung14bis24).toBe(true);
      expect(werteFuer('23:59').WohnungUeber24).toBe(false);
    });
  });

  describe('BeamterUeber8Wohnung', () => {
    it('nur wahr, wenn Beamter UND Dauer > 8h', () => {
      expect(
        ewtAbgeleiteteWerte({ abWE: '00:00', anWE: '08:01', ab1E: undefined, an1E: undefined }, true)
          .BeamterUeber8Wohnung,
      ).toBe(true);
      expect(
        ewtAbgeleiteteWerte({ abWE: '00:00', anWE: '08:01', ab1E: undefined, an1E: undefined }, false)
          .BeamterUeber8Wohnung,
      ).toBe(false);
      expect(
        ewtAbgeleiteteWerte({ abWE: '00:00', anWE: '08:00', ab1E: undefined, an1E: undefined }, true)
          .BeamterUeber8Wohnung,
      ).toBe(false);
    });
  });

  describe('TkgSt-Zeitbänder', () => {
    const werteFuer = (dauer: string) =>
      ewtAbgeleiteteWerte({ abWE: undefined, anWE: undefined, ab1E: '00:00', an1E: dauer }, false);

    it('genau 8h liegt in keinem Band, 23:59 (obere Grenze inklusiv) noch im 8-24h-Band', () => {
      expect(werteFuer('08:00').TkgSt8bis24).toBe(false);
      expect(werteFuer('23:59').TkgSt8bis24).toBe(true);
      expect(werteFuer('23:59').TkgStUeber24).toBe(false);
    });

    it('8h01 liegt im 8-24h-Band', () => {
      expect(werteFuer('08:01').TkgSt8bis24).toBe(true);
    });
  });
});
