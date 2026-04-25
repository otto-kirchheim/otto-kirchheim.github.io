import { describe, expect, it } from 'bun:test';

import type { IDatenEWT } from '../src/ts/core/types';
import validateEwtZeitenReihenfolge from '../src/ts/features/EWT/utils/validateEwtZeitenReihenfolge';

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
      expect(validateEwtZeitenReihenfolge(createEWT())).toBeNull();
    });

    it('gibt null zurück wenn weniger als 2 Felder befüllt sind', () => {
      expect(validateEwtZeitenReihenfolge(createEWT({ abWE: '06:00' }))).toBeNull();
    });

    it('gibt null zurück bei korrekter aufsteigender Reihenfolge', () => {
      expect(
        validateEwtZeitenReihenfolge(
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
        validateEwtZeitenReihenfolge(createEWT({ abWE: '06:00', beginE: '06:00', endeE: '14:30', anWE: '14:30' })),
      ).toBeNull();
    });

    it('gibt null zurück wenn nur 2 Felder korrekt befüllt sind', () => {
      expect(validateEwtZeitenReihenfolge(createEWT({ abWE: '06:00', anWE: '15:00' }))).toBeNull();
    });

    it('gibt Fehlermeldung zurück bei falscher Reihenfolge über 20h-Grenze', () => {
      // anWE (04:00) < abWE (06:00) → Rollover → Gesamtspanne > 20h
      const result = validateEwtZeitenReihenfolge(
        createEWT({ abWE: '06:00', beginE: '06:20', endeE: '15:00', anWE: '04:00' }),
      );
      expect(result).not.toBeNull();
      expect(result?.map(fehler => fehler.feld)).toEqual(['endeE', 'anWE']);
      expect(result?.[0]?.message).toContain('Muss zwischen "Arbeitszeit Von" und "An Wohnung" liegen.');
      expect(result?.[1]?.message).toContain('Muss nach "Arbeitszeit Bis" liegen.');
    });
  });

  describe('Nachtschicht (N) – Tageswechsel', () => {
    it('gibt null zurück bei korrekter N-Schicht mit Mitternacht', () => {
      // Schicht beginnt am 25.03., endet am 26.03.
      expect(
        validateEwtZeitenReihenfolge(
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
        validateEwtZeitenReihenfolge(
          createEWT({ schichtE: 'N', abWE: '19:00', beginE: '19:30', endeE: '20:00', anWE: '20:30' }),
        ),
      ).toBeNull();
    });

    it('gibt Fehlermeldung zurück wenn an1E falsch (19:40 statt ~05:40)', () => {
      const result = validateEwtZeitenReihenfolge(
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
      expect(result?.map(fehler => fehler.feld)).toEqual(['an1E', 'endeE']);
      expect(result?.[0]?.message).toContain('Muss zwischen "Ab Einsatzort" und "An Wohnung" liegen.');
      expect(result?.[1]?.message).toContain('Muss zwischen "An 1.Tgk.-St." und "An Wohnung" liegen.');
    });

    it('erkennt an1E als zu früh wenn es vor abEE liegt', () => {
      const result = validateEwtZeitenReihenfolge(
        createEWT({
          tagE: '2026-03-20',
          eOrtE: 'Mühlbach',
          schichtE: 'N',
          abWE: '19:25',
          beginE: '19:45',
          ab1E: '20:30',
          anEE: '20:50',
          abEE: '05:10',
          an1E: '04:30',
          endeE: '06:15',
          anWE: '06:35',
        }),
      );

      expect(result).not.toBeNull();
      expect(result?.map(fehler => fehler.feld)).toEqual(['abEE', 'an1E']);
      expect(result?.[0]?.message).toContain('Muss zwischen "An Einsatzort" und "Arbeitszeit Bis" liegen.');
    });

    it('markiert beginE bei beginE vor abWE', () => {
      const result = validateEwtZeitenReihenfolge(
        createEWT({
          tagE: '2026-03-20',
          eOrtE: 'Mühlbach',
          schichtE: 'N',
          abWE: '19:25',
          beginE: '18:45',
          ab1E: '20:30',
          anEE: '20:50',
          abEE: '05:10',
          an1E: '05:30',
          endeE: '06:15',
          anWE: '06:35',
        }),
      );

      expect(result).not.toBeNull();
      expect(result?.map(fehler => fehler.feld)).toEqual(['abWE', 'beginE']);
      expect(result?.[0]?.message).toContain('Muss vor "Arbeitszeit Von" liegen.');
    });

    it('markiert beginE bei beginE vor abWE (zweiter Repro-Fall)', () => {
      const result = validateEwtZeitenReihenfolge(
        createEWT({
          tagE: '2026-03-20',
          eOrtE: 'Mühlbach',
          schichtE: 'N',
          abWE: '20:25',
          beginE: '19:45',
          ab1E: '20:30',
          anEE: '20:50',
          abEE: '05:10',
          an1E: '05:30',
          endeE: '06:15',
          anWE: '06:35',
        }),
      );

      expect(result).not.toBeNull();
      expect(result?.map(fehler => fehler.feld)).toEqual(['abWE', 'beginE']);
    });

    it('markiert beginE und ab1E wenn anEE formal zu frueh ist (ab1E vor beginE)', () => {
      const result = validateEwtZeitenReihenfolge(
        createEWT({
          tagE: '2026-03-20',
          eOrtE: 'Mühlbach',
          schichtE: 'N',
          abWE: '19:25',
          beginE: '19:45',
          ab1E: '19:30',
          anEE: '20:50',
          abEE: '05:10',
          an1E: '05:30',
          endeE: '06:15',
          anWE: '06:35',
        }),
      );

      expect(result).not.toBeNull();
      expect(result?.map(fehler => fehler.feld)).toEqual(['beginE', 'ab1E']);
      expect(result?.[0]?.message).toContain('Muss zwischen "Ab Wohnung" und "An Einsatzort" liegen.');
    });

    it('zeigt bei beginE=20:45 und ab1E=20:30 den beginE-Hinweis zwischen Ab Wohnung und An Einsatzort', () => {
      const result = validateEwtZeitenReihenfolge(
        createEWT({
          tagE: '2026-03-20',
          eOrtE: 'Mühlbach',
          schichtE: 'N',
          abWE: '19:25',
          beginE: '20:45',
          ab1E: '20:30',
          anEE: '20:50',
          abEE: '05:10',
          an1E: '05:30',
          endeE: '06:15',
          anWE: '06:35',
        }),
      );

      expect(result).not.toBeNull();
      expect(result?.map(fehler => fehler.feld)).toEqual(['beginE', 'ab1E']);
      expect(result?.[0]?.message).toContain('Muss zwischen "Ab Wohnung" und "An Einsatzort" liegen.');
    });

    it('zeigt bei anWE vor endeE den endeE-Hinweis mit zwischen-Text', () => {
      const result = validateEwtZeitenReihenfolge(
        createEWT({
          tagE: '2026-03-20',
          eOrtE: 'Mühlbach',
          schichtE: 'N',
          abWE: '19:25',
          beginE: '19:45',
          ab1E: '20:30',
          anEE: '21:00',
          abEE: '05:10',
          an1E: '05:30',
          endeE: '06:15',
          anWE: '05:35',
        }),
      );

      expect(result).not.toBeNull();
      expect(result?.map(fehler => fehler.feld)).toEqual(['endeE', 'anWE']);
      expect(result?.[0]?.message).toContain('Muss zwischen "An 1.Tgk.-St." und "An Wohnung" liegen.');
      expect(result?.[1]?.message).toContain('Muss nach "Arbeitszeit Bis" liegen.');
    });
  });

  describe('Teilweise befüllte Felder – Edge-Cases', () => {
    it('gibt Fehlermeldung mit "Muss nach" zurück wenn rollover.curr das letzte Feld ohne Nachbarn ist', () => {
      // Nur beginE und endeE gesetzt. endeE < beginE → rollover.curr=endeE ist letztes resolved-Feld (kein nextFeld).
      // getZwischenMessage(endeE) → prevFeld=beginE, nextFeld=null → "Muss nach" statt "Muss zwischen"
      // getVorherigesFeldMessage(beginE) → beginE an Index 0 → leftBound=null → Fallback-Return
      const result = validateEwtZeitenReihenfolge(createEWT({ beginE: '10:00', endeE: '09:00' }));
      expect(result).not.toBeNull();
      expect(result?.map(f => f.feld)).toContain('endeE');
      expect(result?.find(f => f.feld === 'endeE')?.message).toBe('Muss nach "Arbeitszeit Von" liegen.');
      expect(result?.find(f => f.feld === 'beginE')?.message).toBe('Muss vor "Arbeitszeit Bis" liegen.');
    });

    it('löst MAX_SPAN_GUARD aus wenn Zeitspanne > 20h ohne Rollover (T-Schicht)', () => {
      // abWE=00:00, anWE=21:30 → Spanne 21.5h > 20h, keine Rollover → MAX_SPAN_MINUTES-Guard
      const result = validateEwtZeitenReihenfolge(createEWT({ abWE: '00:00', anWE: '21:30' }));
      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result?.[0]?.feld).toBe('anWE');
      expect(result?.[0]?.message).toContain('Muss nach "Ab Wohnung" liegen.');
    });
  });

  describe('Bereitschaft + Nacht (BN)', () => {
    it('gibt null zurück bei korrekter BN-Schicht mit Tageswechsel', () => {
      expect(
        validateEwtZeitenReihenfolge(
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
      expect(validateEwtZeitenReihenfolge(createEWT({ beginE: '06:00', endeE: '14:30' }))).toBeNull();
    });

    it('gibt Fehlermeldung zurück wenn beginE nach endeE liegt (T-Schicht, 2. Rollover)', () => {
      // endeE (05:00) < beginE (06:00) → Rollover → Spanne > 20h
      const result = validateEwtZeitenReihenfolge(
        createEWT({ abWE: '05:50', beginE: '06:00', endeE: '05:00', anWE: '05:30' }),
      );
      expect(result).not.toBeNull();
      expect(result?.map(fehler => fehler.feld)).toEqual(['beginE', 'endeE']);
      expect(result?.[0]?.message).toContain('Muss zwischen "Ab Wohnung" und "An Wohnung" liegen.');
      expect(result?.[1]?.message).toContain('Muss zwischen "Arbeitszeit Von" und "An Wohnung" liegen.');
    });

    it('gibt mehrere Fehlermeldungen zurück wenn mehrere unerwartete Rollovers vorliegen', () => {
      const result = validateEwtZeitenReihenfolge(
        createEWT({
          abWE: '06:00',
          beginE: '06:30',
          ab1E: '05:00',
          anEE: '05:20',
          abEE: '04:00',
          an1E: '04:10',
          endeE: '15:00',
          anWE: '15:30',
        }),
      );

      expect(result).not.toBeNull();
      expect(result?.length).toBe(4);
      expect(result?.map(fehler => fehler.feld)).toEqual(['beginE', 'ab1E', 'anEE', 'abEE']);
      expect(result?.[1]?.message).toContain('Muss zwischen "Arbeitszeit Von" und "An Einsatzort" liegen.');
    });

    it('gibt null zurück wenn nur anWE befüllt', () => {
      expect(validateEwtZeitenReihenfolge(createEWT({ anWE: '15:00' }))).toBeNull();
    });
  });
});
