import { describe, expect, it } from 'vitest';

import type { IDatenEWT } from '../src/ts/interfaces';
import validateZeitenReihenfolge from '../src/ts/EWT/utils/validateZeitenReihenfolge';

function createEWT(overrides: Partial<IDatenEWT> = {}): IDatenEWT {
  return {
    tagE: '2026-03-26',
    eOrtE: 'Fulda',
    schichtE: 'T',
    abWE: '',
    beginE: '',
    ab1E: '',
    anEE: '',
    abEE: '',
    an1E: '',
    endeE: '',
    anWE: '',
    berechnen: true,
    ...overrides,
  };
}

describe('validateZeitenReihenfolge', () => {
  describe('Tagschicht (T)', () => {
    it('gibt null zurück wenn alle Felder leer sind', () => {
      expect(validateZeitenReihenfolge(createEWT())).toBeNull();
    });

    it('gibt null zurück wenn weniger als 2 Felder befüllt sind', () => {
      expect(validateZeitenReihenfolge(createEWT({ abWE: '06:00' }))).toBeNull();
    });

    it('gibt null zurück bei korrekter aufsteigender Reihenfolge', () => {
      expect(
        validateZeitenReihenfolge(
          createEWT({
            abWE: '06:00',
            beginE: '06:20',
            ab1E: '07:00',
            anEE: '07:30',
            abEE: '15:30',
            an1E: '16:00',
            endeE: '16:30',
            anWE: '17:00',
          }),
        ),
      ).toBeNull();
    });

    it('gibt null zurück wenn mehrere Felder gleiche Zeit haben', () => {
      expect(
        validateZeitenReihenfolge(createEWT({ abWE: '06:00', beginE: '06:00', endeE: '14:30', anWE: '14:30' })),
      ).toBeNull();
    });

    it('gibt null zurück wenn nur 2 Felder korrekt befüllt sind', () => {
      expect(validateZeitenReihenfolge(createEWT({ abWE: '06:00', anWE: '15:00' }))).toBeNull();
    });

    it('gibt Fehlermeldung zurück bei falscher Reihenfolge über 20h-Grenze', () => {
      // anWE (04:00) < abWE (06:00) → Rollover → Gesamtspanne > 20h
      const result = validateZeitenReihenfolge(
        createEWT({ abWE: '06:00', beginE: '06:20', endeE: '15:00', anWE: '04:00' }),
      );
      expect(result).not.toBeNull();
      expect(result).toContain('Arbeitszeit Bis');
      expect(result).toContain('An Wohnung');
    });
  });

  describe('Nachtschicht (N) – Tageswechsel', () => {
    it('gibt null zurück bei korrekter N-Schicht mit Mitternacht', () => {
      // Schicht beginnt am 25.03., endet am 26.03.
      expect(
        validateZeitenReihenfolge(
          createEWT({
            schichtE: 'N',
            abWE: '19:25',
            beginE: '19:45',
            ab1E: '20:15',
            anEE: '21:00',
            abEE: '05:10',
            an1E: '05:40',
            endeE: '06:15',
            anWE: '06:35',
          }),
        ),
      ).toBeNull();
    });

    it('gibt null zurück wenn N-Schicht nur Abendfelder befüllt hat (kein Tageswechsel nötig)', () => {
      expect(
        validateZeitenReihenfolge(
          createEWT({ schichtE: 'N', abWE: '19:00', beginE: '19:30', endeE: '20:00', anWE: '20:30' }),
        ),
      ).toBeNull();
    });

    it('gibt Fehlermeldung zurück wenn an1E falsch (19:40 statt ~05:40)', () => {
      const result = validateZeitenReihenfolge(
        createEWT({
          schichtE: 'N',
          abWE: '19:25',
          beginE: '19:45',
          ab1E: '20:15',
          anEE: '21:00',
          abEE: '05:10',
          an1E: '19:40', // falsch: nach Mitternacht war schon abEE=05:10
          endeE: '06:15',
          anWE: '06:35',
        }),
      );
      expect(result).not.toBeNull();
      expect(result).toContain('An 1.Tgk.-St.');
      expect(result).toContain('Arbeitszeit Bis');
    });
  });

  describe('Bereitschaft + Nacht (BN)', () => {
    it('gibt null zurück bei korrekter BN-Schicht mit Tageswechsel', () => {
      expect(
        validateZeitenReihenfolge(
          createEWT({
            schichtE: 'BN',
            abWE: '17:00',
            beginE: '19:00',
            endeE: '06:00',
            anWE: '06:30',
          }),
        ),
      ).toBeNull();
    });
  });

  describe('Teilweise befüllte Felder', () => {
    it('gibt null zurück wenn nur Arbeitszeit-Felder korrekt gesetzt sind', () => {
      expect(validateZeitenReihenfolge(createEWT({ beginE: '06:00', endeE: '14:30' }))).toBeNull();
    });

    it('gibt Fehlermeldung zurück wenn beginE nach endeE liegt (T-Schicht, 2. Rollover)', () => {
      // endeE (05:00) < beginE (06:00) → Rollover → Spanne > 20h
      const result = validateZeitenReihenfolge(
        createEWT({ abWE: '05:50', beginE: '06:00', endeE: '05:00', anWE: '05:30' }),
      );
      expect(result).not.toBeNull();
      expect(result).toContain('Arbeitszeit Von');
      expect(result).toContain('Arbeitszeit Bis');
    });

    it('gibt null zurück wenn nur anWE befüllt', () => {
      expect(validateZeitenReihenfolge(createEWT({ anWE: '15:00' }))).toBeNull();
    });
  });
});
