import { describe, expect, it } from 'bun:test';
import dayjs from '@/shared/lib/date/configDayjs';
import { type BackendNebengeld, nebengeldFromBackend, nebengeldToBackend } from '@/features/ez/model/backend';
import type { IDatenN } from '@/shared/types';

// ─── nebengeldFromBackend / nebengeldToBackend ───────────

describe('fieldMapper – Nebengeld', () => {
  const backendN: BackendNebengeld = {
    _id: 'n1',
    Monat: 3,
    Jahr: 2024,
    Tag: '2024-03-20T00:00:00.000Z',
    Beginn: '18:00',
    Ende: '06:00',
    Auftragsnummer: 'NB-456',
    Zulagen: [{ Typ: '040', Wert: 3 }],
  };

  it('nebengeldFromBackend konvertiert korrekt', () => {
    const result = nebengeldFromBackend(backendN);
    expect(result._id).toBe('n1');
    expect(result.Tag).toBe(dayjs('2024-03-20T00:00:00.000Z').format('DD.MM.YYYY'));
    expect(result.Beginn).toBe('18:00');
    expect(result.Ende).toBe('06:00');
    expect(result.Zulagen).toEqual([{ Typ: '040', Wert: 3 }]);
    expect(result.zulagenAnzeigeN).toBe('040 Fahrentsch. × 3');
    expect(result.Auftragsnummer).toBe('NB-456');
  });

  it('nebengeldFromBackend ohne Zulage 040', () => {
    const withoutZulage = { ...backendN, Zulagen: [{ Typ: '050', Wert: 1 }] };
    const result = nebengeldFromBackend(withoutZulage);
    expect(result.Zulagen).toEqual([{ Typ: '050', Wert: 1 }]);
  });

  it('nebengeldFromBackend ohne Auftragsnummer', () => {
    const withoutAuftrag = { ...backendN, Auftragsnummer: undefined };
    const result = nebengeldFromBackend(withoutAuftrag);
    expect(result.Auftragsnummer).toBe('');
  });

  it('nebengeldToBackend konvertiert korrekt', () => {
    const frontendN: IDatenN = {
      _id: 'n1',
      Tag: '20.03.2024',
      Beginn: '18:00',
      Ende: '06:00',
      Zulagen: [
        { Typ: '040', Wert: 3 },
        { Typ: '811', Wert: 120 },
      ],
      Auftragsnummer: 'NB-456',
    };
    const result = nebengeldToBackend(frontendN, 3, 2024);
    expect(result._id).toBe('n1');
    expect(result.Monat).toBe(3);
    expect(result.Jahr).toBe(2024);
    expect(result.Beginn).toBe('18:00');
    expect(result.Ende).toBe('06:00');
    expect(result.Auftragsnummer).toBe('NB-456');
    expect(result.Zulagen).toEqual([
      { Typ: '040', Wert: 3 },
      { Typ: '811', Wert: 120 },
    ]);
    expect(dayjs(result.Tag).isValid()).toBe(true);
    expect(dayjs(result.Tag).date()).toBe(20);
    expect(dayjs(result.Tag).month()).toBe(2); // 0-indexed
    expect(dayjs(result.Tag).year()).toBe(2024);
  });

  it('nebengeldFromBackend mit EWT null liefert EWT undefined', () => {
    const withNullEwt = { ...backendN, EWT: null };
    const result = nebengeldFromBackend(withNullEwt);
    expect(result.EWT).toBeUndefined();
  });

  it('nebengeldToBackend sendet gesetzte EWT als EWT', () => {
    const frontendN: IDatenN = {
      Tag: '15.03.2024',
      Beginn: '20:00',
      Ende: '04:00',
      Auftragsnummer: '',
      EWT: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    };
    const result = nebengeldToBackend(frontendN, 3, 2024);
    expect(result.EWT).toBe('aaaaaaaaaaaaaaaaaaaaaaaa');
  });

  it('nebengeldToBackend sendet fehlende EWT als EWT null (Unlink-Signal für den Server)', () => {
    const frontendN: IDatenN = {
      Tag: '15.03.2024',
      Beginn: '20:00',
      Ende: '04:00',
      Auftragsnummer: '',
    };
    const result = nebengeldToBackend(frontendN, 3, 2024);
    expect(result.EWT).toBeNull();
  });

  it('nebengeldToBackend sendet leere Auftragsnummer explizit mit (damit Updates sie serverseitig leeren)', () => {
    const frontendN: IDatenN = {
      Tag: '15.03.2024',
      Beginn: '20:00',
      Ende: '04:00',
      Auftragsnummer: '',
    };
    const result = nebengeldToBackend(frontendN, 3, 2024);
    expect(result.Auftragsnummer).toBe('');
  });

  it('nebengeldToBackend ohne Zulagen erzeugt ein leeres Zulagen-Array', () => {
    const frontendN: IDatenN = {
      Tag: '10.03.2024',
      Beginn: '19:00',
      Ende: '05:00',
      Auftragsnummer: '',
    };
    const result = nebengeldToBackend(frontendN, 3, 2024);
    expect(result.Zulagen).toEqual([]);
  });
});

// ─── userProfileFromBackend / userProfileToBackend ───────
