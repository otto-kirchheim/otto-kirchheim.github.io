import { describe, expect, it } from 'bun:test';
import dayjs from '@/shared/lib/date/configDayjs';
import { type BackendEWT, ewtFromBackend, ewtToBackend } from '@/features/ewt/model/backend';
import type { IDatenEWT } from '@/shared/types';

// ─── ewtFromBackend / ewtToBackend ───────────────────────

describe('fieldMapper – EWT (Einsatzwechseltätigkeit)', () => {
  const backendEWT: BackendEWT = {
    _id: 'ewt1',
    Monat: 4,
    Jahr: 2024,
    Tag: '2024-04-10T00:00:00.000Z',
    Buchungstag: '2024-04-11T00:00:00.000Z',
    Einsatzort: 'Frankfurt',
    Schicht: 'Tag',
    abWE: '06:00',
    ab1E: '06:30',
    anEE: '07:15',
    beginE: '07:30',
    endeE: '16:00',
    abEE: '16:15',
    an1E: '17:00',
    anWE: '17:30',
    berechnen: true,
  };

  it('ewtFromBackend konvertiert korrekt', () => {
    const result = ewtFromBackend(backendEWT);
    expect(result._id).toBe('ewt1');
    expect(result.Tag).toBe(dayjs('2024-04-10T00:00:00.000Z').format('YYYY-MM-DD'));
    expect(result.Buchungstag).toBe(dayjs('2024-04-11T00:00:00.000Z').format('YYYY-MM-DD'));
    expect(result.Einsatzort).toBe('Frankfurt');
    expect(result.Schicht).toBe('Tag');
    expect(result.abWE).toBe('06:00');
    expect(result.berechnen).toBe(true);
  });

  it('ewtFromBackend setzt optionale Felder auf Defaults', () => {
    const minimal: BackendEWT = {
      _id: 'ewt2',
      Monat: 1,
      Jahr: 2024,
      Tag: '2024-01-05T00:00:00.000Z',
      Buchungstag: '2024-01-05T00:00:00.000Z',
      Schicht: 'Spät',
    };
    const result = ewtFromBackend(minimal);
    expect(result.Einsatzort).toBe('');
    expect(result.abWE).toBe('');
    expect(result.ab1E).toBe('');
    expect(result.anEE).toBe('');
    expect(result.beginE).toBe('');
    expect(result.endeE).toBe('');
    expect(result.abEE).toBe('');
    expect(result.an1E).toBe('');
    expect(result.anWE).toBe('');
    expect(result.berechnen).toBe(true);
  });

  it('ewtFromBackend mit berechnen=false', () => {
    const doc = { ...backendEWT, berechnen: false };
    expect(ewtFromBackend(doc).berechnen).toBe(false);
  });

  it('ewtToBackend konvertiert korrekt', () => {
    const frontendEWT: IDatenEWT = {
      _id: 'ewt1',
      Tag: '2024-04-10',
      Buchungstag: '2024-04-11',
      Einsatzort: 'Frankfurt',
      Schicht: 'Tag',
      abWE: '06:00',
      ab1E: '06:30',
      anEE: '07:15',
      beginE: '07:30',
      endeE: '16:00',
      abEE: '16:15',
      an1E: '17:00',
      anWE: '17:30',
      berechnen: true,
    };
    const result = ewtToBackend(frontendEWT, 4, 2024);
    expect(result._id).toBe('ewt1');
    expect(result.Monat).toBe(4);
    expect(result.Jahr).toBe(2024);
    expect(result.Einsatzort).toBe('Frankfurt');
    expect(result.Schicht).toBe('Tag');
    expect(result.abWE).toBe('06:00');
    expect(dayjs(result.Tag).isValid()).toBe(true);
    expect(dayjs(result.Buchungstag).isValid()).toBe(true);
    expect(dayjs(result.Buchungstag).date()).toBe(11);
  });

  it('ewtToBackend leitet Monat beim Monatswechsel aus dem Starttag statt aus Buchungstag/UI-Filter ab', () => {
    const frontendEWT: IDatenEWT = {
      Tag: '2026-03-31',
      Buchungstag: '2026-04-01',
      Einsatzort: 'Fulda',
      Schicht: 'N',
      abWE: '21:30',
      ab1E: '',
      anEE: '',
      beginE: '22:00',
      endeE: '02:30',
      abEE: '',
      an1E: '',
      anWE: '',
      berechnen: true,
    };

    const result = ewtToBackend(frontendEWT, 5, 2026);

    expect(result.Monat).toBe(3);
    expect(result.Jahr).toBe(2026);
    expect(dayjs(result.Tag).format('YYYY-MM-DD')).toBe('2026-03-31');
    expect(dayjs(result.Buchungstag).format('YYYY-MM-DD')).toBe('2026-04-01');
  });

  it('ewtToBackend sendet leere Strings explizit mit (damit Updates gelöschte Zeiten überschreiben)', () => {
    const frontendEWT: IDatenEWT = {
      Tag: '2024-04-10',
      Buchungstag: '2024-04-10',
      Einsatzort: '',
      Schicht: 'Nacht',
      abWE: '',
      ab1E: '',
      anEE: '',
      beginE: '',
      endeE: '',
      abEE: '',
      an1E: '',
      anWE: '',
      berechnen: true,
    };
    const result = ewtToBackend(frontendEWT, 4, 2024);
    expect(result.Einsatzort).toBe('');
    expect(result.abWE).toBe('');
    expect(result.ab1E).toBe('');
    expect(result.anEE).toBe('');
    expect(result.beginE).toBe('');
    expect(result.endeE).toBe('');
    expect(result.abEE).toBe('');
    expect(result.an1E).toBe('');
    expect(result.anWE).toBe('');
  });
});
