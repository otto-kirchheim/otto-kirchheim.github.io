import { describe, expect, it } from 'bun:test';
import {
  bereinigteZulagenStunden,
  geldwertZulagenCode,
  summeBereinigtGruppe,
  summeGeldwertGruppe,
} from '@/infrastructure/pdf/zulagenWerte';
import type { Zeile } from '@otto-kirchheim/nebengeld-shared';

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
    const rows: Zeile[] = [{ Zulagen: [{ Typ: '811', Wert: 60 }] }, { Zulagen: [{ Typ: '040', Wert: 2 }] }];
    expect(summeGeldwertGruppe(rows, gruppe, geld)).toBeCloseTo(Math.round(60 / 60) * 2 + 2 * 6.65);
  });

  it('mehrere Einträge in derselben Zeile summieren sich', () => {
    const rows: Zeile[] = [
      {
        Zulagen: [
          { Typ: '811', Wert: 60 },
          { Typ: '811', Wert: 120 },
        ],
      },
    ];
    expect(summeGeldwertGruppe(rows, gruppe, geld)).toBe((Math.round(60 / 60) + Math.round(120 / 60)) * 2);
  });

  it('nicht-Array-Quelle (keine Zulage) -> undefined statt 0', () => {
    const rows: Zeile[] = [{ Zulagen: 'kaputt' }];
    expect(summeGeldwertGruppe(rows, gruppe, geld)).toBeUndefined();
  });

  it('unbekannter Code im Eintrag wird ignoriert (trägt 0 bei) -- die Spalte trägt trotzdem eine Zulagenart', () => {
    const rows: Zeile[] = [{ Zulagen: [{ Typ: '999', Wert: 100 }] }];
    expect(summeGeldwertGruppe(rows, gruppe, geld)).toBe(0);
  });

  it('keine Zeilen -> undefined', () => {
    expect(summeGeldwertGruppe([], gruppe, geld)).toBeUndefined();
  });

  it('Einträge ohne Code (fehlende Zulagenart) -> undefined', () => {
    expect(summeGeldwertGruppe([{ Zulagen: [{ Wert: 100 }] }], gruppe, geld)).toBeUndefined();
  });
});

describe('summeBereinigtGruppe (Std.-Gesamtsumme über alle Einträge einer Listen-Gruppe, je Eintrag mit eigenem Code)', () => {
  const gruppe = { quelle: 'Zulagen', schluessel: 'Typ', wert: 'Wert' };

  it('summiert die Std.-Umrechnung mehrerer Minuten-Codes zusammen', () => {
    const rows: Zeile[] = [
      {
        Zulagen: [
          { Typ: '811', Wert: 60 },
          { Typ: '811', Wert: 120 },
        ],
      },
    ];
    expect(summeBereinigtGruppe(rows, gruppe)).toBe(1 + 2);
  });

  it('Stück-Codes (keine Std.-Umrechnung) tragen 0 bei statt die Summe zu verwerfen', () => {
    const rows: Zeile[] = [
      {
        Zulagen: [
          { Typ: '811', Wert: 60 },
          { Typ: '040', Wert: 3 },
        ],
      },
    ];
    expect(summeBereinigtGruppe(rows, gruppe)).toBe(1);
  });

  it('nicht-Array-Quelle (keine Zulage) -> undefined statt 0', () => {
    expect(summeBereinigtGruppe([{ Zulagen: 'kaputt' }], gruppe)).toBeUndefined();
  });

  it('keine Zeilen -> undefined', () => {
    expect(summeBereinigtGruppe([], gruppe)).toBeUndefined();
  });

  it('nur Stück-Codes (keine Std.-Umrechnung, aber vorhandene Zulagenart) -> 0, nicht undefined', () => {
    expect(summeBereinigtGruppe([{ Zulagen: [{ Typ: '040', Wert: 3 }] }], gruppe)).toBe(0);
  });
});
