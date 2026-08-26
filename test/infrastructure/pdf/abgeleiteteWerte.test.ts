import { describe, expect, it } from 'bun:test';
import {
  beAbgeleiteteWerte,
  bereinigteZulagenStunden,
  bereitschaftszulageAbgeleiteteWerte,
  bzAbgeleiteteWerte,
  ewtAbgeleiteteWerte,
  ezAbgeleiteteWerte,
  geldwertZulagenCode,
  summeBereinigtGruppe,
  summeGeldwertGruppe,
} from '@/infrastructure/pdf/abgeleiteteWerte';
import type { Zeile } from '@otto-kirchheim/nebengeld-shared';

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
    const werteFuer = (dauer: string) => ewtAbgeleiteteWerte({ abWE: '00:00', anWE: dauer, ab1E: undefined, an1E: undefined }, false);

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
      expect(ewtAbgeleiteteWerte({ abWE: '00:00', anWE: '08:01', ab1E: undefined, an1E: undefined }, true).BeamterUeber8Wohnung).toBe(true);
      expect(ewtAbgeleiteteWerte({ abWE: '00:00', anWE: '08:01', ab1E: undefined, an1E: undefined }, false).BeamterUeber8Wohnung).toBe(false);
      expect(ewtAbgeleiteteWerte({ abWE: '00:00', anWE: '08:00', ab1E: undefined, an1E: undefined }, true).BeamterUeber8Wohnung).toBe(false);
    });
  });

  describe('TkgSt-Zeitbänder', () => {
    const werteFuer = (dauer: string) => ewtAbgeleiteteWerte({ abWE: undefined, anWE: undefined, ab1E: '00:00', an1E: dauer }, false);

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

describe('bzAbgeleiteteWerte', () => {
  it('berechnet Dauer in Minuten über Ende minus Beginn plus Pause', () => {
    const werte = bzAbgeleiteteWerte({ Beginn: '2026-04-19T08:00:00.000Z', Ende: '2026-04-19T16:00:00.000Z', Pause: 30 });
    expect(werte.Dauer).toBe(510);
  });

  it('läuft über Tage, ohne Mitternachts-Korrektur', () => {
    const werte = bzAbgeleiteteWerte({ Beginn: '2026-04-19T08:00:00.000Z', Ende: '2026-04-22T08:00:00.000Z', Pause: 0 });
    expect(werte.Dauer).toBe(4320);
  });

  it('addiert Pause auch bei kurzem Zeitraum, ohne zu deckeln', () => {
    const werte = bzAbgeleiteteWerte({ Beginn: '2026-04-19T08:00:00.000Z', Ende: '2026-04-19T09:00:00.000Z', Pause: 90 });
    expect(werte.Dauer).toBe(150);
  });
});

describe('beAbgeleiteteWerte', () => {
  it('berechnet Dauer in Minuten über Ende minus Beginn', () => {
    expect(beAbgeleiteteWerte({ Beginn: '01:15', Ende: '02:00', PrivatKm: 0 }, 0, false).Dauer).toBe(45);
  });

  it('ergänzt über Mitternacht (Ende < Beginn)', () => {
    expect(beAbgeleiteteWerte({ Beginn: '23:00', Ende: '01:00', PrivatKm: 0 }, 0, false).Dauer).toBe(120);
  });

  it('berechnet PrivatKmBetrag über PrivatKm mal Satz, für Beamter', () => {
    expect(beAbgeleiteteWerte({ Beginn: '01:00', Ende: '02:00', PrivatKm: 12 }, 0.27, true).PrivatKmBetrag).toBe(3.24);
  });

  it('rundet auf 2 Nachkommastellen (Fließkomma-Rauschen, 13 * 0.27 === 3.5100000000000002)', () => {
    expect(beAbgeleiteteWerte({ Beginn: '01:00', Ende: '02:00', PrivatKm: 13 }, 0.27, true).PrivatKmBetrag).toBe(3.51);
  });

  it('liefert 0 ohne Privat-km', () => {
    expect(beAbgeleiteteWerte({ Beginn: '01:00', Ende: '02:00', PrivatKm: 0 }, 0.27, true).PrivatKmBetrag).toBe(0);
  });

  it('Tarifkraft: rohe km gesetzt, PrivatKmBetrag undefined', () => {
    const werte = beAbgeleiteteWerte({ Beginn: '01:00', Ende: '02:00', PrivatKm: 12 }, 0.27, false);
    expect(werte.PrivatKm).toBe(12);
    expect(werte.PrivatKmBetrag).toBeUndefined();
  });

  it('Beamter: PrivatKmBetrag gesetzt, rohe km undefined', () => {
    const werte = beAbgeleiteteWerte({ Beginn: '01:00', Ende: '02:00', PrivatKm: 12 }, 0.27, true);
    expect(werte.PrivatKm).toBeUndefined();
    expect(werte.PrivatKmBetrag).toBe(3.24);
  });
});

describe('ezAbgeleiteteWerte', () => {
  it('verkettet Beginn und Ende mit Bindestrich', () => {
    expect(ezAbgeleiteteWerte({ Beginn: '07:00', Ende: '15:45' }).Arbeitszeit).toBe('07:00-15:45');
  });

  it('keine Sonderbehandlung über Mitternacht -- reine Textverkettung', () => {
    expect(ezAbgeleiteteWerte({ Beginn: '23:00', Ende: '01:00' }).Arbeitszeit).toBe('23:00-01:00');
  });
});

describe('geldwertZulagenCode (repliziert calculateBerechnungRows.ts::N_ZULAGEN_CALC je einzelnem Code)', () => {
  const geld = { A: 1, B: 2, C: 3, Fahrentsch: 6.65, SIPO: 5, GKR: 4 };

  it('Fahrentschädigung (Code 040): Stückzahl mal Satz, keine Stundenrundung', () => {
    expect(geldwertZulagenCode('040', 3, geld)).toBe(3 * 6.65);
  });

  it('paymentHint A (Code 841): Minuten auf volle Stunden gerundet, mal Satz A', () => {
    expect(geldwertZulagenCode('841', 90, geld)).toBe(Math.round(90 / 60) * 1);
  });

  it('paymentHint B (Code 811): Minuten auf volle Stunden gerundet, mal Satz B', () => {
    expect(geldwertZulagenCode('811', 150, geld)).toBe(Math.round(150 / 60) * 2);
  });

  it('paymentHint C (Code 831): Minuten auf volle Stunden gerundet, mal Satz C', () => {
    expect(geldwertZulagenCode('831', 120, geld)).toBe(2 * 3);
  });

  it('paymentHint C+A (Code 837): kombinierter Satz C plus A', () => {
    expect(geldwertZulagenCode('837', 120, geld)).toBe(2 * (3 + 1));
  });

  it('paymentHint C+B (Code 838): kombinierter Satz C plus B', () => {
    expect(geldwertZulagenCode('838', 120, geld)).toBe(2 * (3 + 2));
  });

  it('paymentHint C*9 (Code 839): Stückzahl mal Satz C mal 9, keine Stundenrundung', () => {
    expect(geldwertZulagenCode('839', 2, geld)).toBe(2 * 3 * 9);
  });

  it('paymentHint SIPO (Code 846): Minuten auf volle Stunden gerundet, mal Satz SIPO', () => {
    expect(geldwertZulagenCode('846', 200, geld)).toBe(Math.round(200 / 60) * 5);
  });

  it('Ganzkörperreinigung (Code 218): Stückzahl mal eigener GKR-Satz', () => {
    expect(geldwertZulagenCode('218', 5, geld)).toBe(5 * 4);
  });

  it('unbekannter Code ergibt 0 statt eines Absturzes', () => {
    expect(geldwertZulagenCode('999', 100, geld)).toBe(0);
  });

  it('fehlender Satz in VorgabenGeld -> 0 statt NaN', () => {
    expect(geldwertZulagenCode('811', 150, {})).toBe(0);
  });
});

describe('bereinigteZulagenStunden (Minuten-Codes gerundet auf volle Stunden, Stück-Codes ohne Umrechnung)', () => {
  it('Minuten-Code (paymentHint B): gerundet auf volle Stunden wie in geldwertZulagenCode()', () => {
    expect(bereinigteZulagenStunden('811', 150)).toBe(3);
  });

  it('Stück-Code (Fahrentschädigung): keine Std.-Umrechnung, undefined statt einer Zahl', () => {
    expect(bereinigteZulagenStunden('040', 3)).toBeUndefined();
  });

  it('Stück-Code (Ganzkörperreinigung): ebenfalls undefined', () => {
    expect(bereinigteZulagenStunden('218', 5)).toBeUndefined();
  });

  it('unbekannter Code: undefined statt eines Absturzes', () => {
    expect(bereinigteZulagenStunden('999', 100)).toBeUndefined();
  });
});

describe('summeGeldwertGruppe (Gesamtsumme über alle Einträge einer Listen-Gruppe, je Eintrag mit eigenem Code)', () => {
  const gruppe = { quelle: 'Zulagen', schluessel: 'Typ', wert: 'Wert' };
  const geld = { B: 2, Fahrentsch: 6.65 };

  it('summiert mehrere unterschiedliche Codes über mehrere Zeilen zusammen', () => {
    const rows: Zeile[] = [
      { Zulagen: [{ Typ: '811', Wert: 60 }] },
      { Zulagen: [{ Typ: '040', Wert: 2 }] },
    ];
    expect(summeGeldwertGruppe(rows, gruppe, geld)).toBeCloseTo(Math.round(60 / 60) * 2 + 2 * 6.65);
  });

  it('mehrere Einträge in derselben Zeile summieren sich', () => {
    const rows: Zeile[] = [{ Zulagen: [{ Typ: '811', Wert: 60 }, { Typ: '811', Wert: 120 }] }];
    expect(summeGeldwertGruppe(rows, gruppe, geld)).toBe((Math.round(60 / 60) + Math.round(120 / 60)) * 2);
  });

  it('nicht-Array-Quelle trägt 0 bei statt abzustürzen', () => {
    const rows: Zeile[] = [{ Zulagen: 'kaputt' }];
    expect(summeGeldwertGruppe(rows, gruppe, geld)).toBe(0);
  });

  it('unbekannter Code im Eintrag wird ignoriert (trägt 0 bei)', () => {
    const rows: Zeile[] = [{ Zulagen: [{ Typ: '999', Wert: 100 }] }];
    expect(summeGeldwertGruppe(rows, gruppe, geld)).toBe(0);
  });

  it('keine Zeilen -> 0', () => {
    expect(summeGeldwertGruppe([], gruppe, geld)).toBe(0);
  });
});

describe('summeBereinigtGruppe (Std.-Gesamtsumme über alle Einträge einer Listen-Gruppe, je Eintrag mit eigenem Code)', () => {
  const gruppe = { quelle: 'Zulagen', schluessel: 'Typ', wert: 'Wert' };

  it('summiert die Std.-Umrechnung mehrerer Minuten-Codes zusammen', () => {
    const rows: Zeile[] = [{ Zulagen: [{ Typ: '811', Wert: 60 }, { Typ: '811', Wert: 120 }] }];
    expect(summeBereinigtGruppe(rows, gruppe)).toBe(1 + 2);
  });

  it('Stück-Codes (keine Std.-Umrechnung) tragen 0 bei statt die Summe zu verwerfen', () => {
    const rows: Zeile[] = [{ Zulagen: [{ Typ: '811', Wert: 60 }, { Typ: '040', Wert: 3 }] }];
    expect(summeBereinigtGruppe(rows, gruppe)).toBe(1);
  });

  it('nicht-Array-Quelle trägt 0 bei statt abzustürzen', () => {
    expect(summeBereinigtGruppe([{ Zulagen: 'kaputt' }], gruppe)).toBe(0);
  });

  it('keine Zeilen -> 0', () => {
    expect(summeBereinigtGruppe([], gruppe)).toBe(0);
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
      const werte = bereitschaftszulageAbgeleiteteWerte(6000, 'Besoldungsgruppe A 8', { 'Besoldungsgruppe A 8': 16.37 });
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
      const werte = bereitschaftszulageAbgeleiteteWerte(6000, 'Besoldungsgruppe A 9', { 'Besoldungsgruppe A 9': 22.49 });
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
      const werte = bereitschaftszulageAbgeleiteteWerte(6000, 'Besoldungsgruppe A 8', { 'Besoldungsgruppe A 8': 16.37 });
      expect(werte.SummeTarif).toBeUndefined();
    });

    it('fehlender Satz in VorgabenGeld -> 0 statt NaN', () => {
      const werte = bereitschaftszulageAbgeleiteteWerte(6000, 'Besoldungsgruppe A 8', {});
      expect(werte.GeldwertBeamter).toBe(0);
      expect(werte.SummeBeamter3).toBe(0);
    });
  });
});
