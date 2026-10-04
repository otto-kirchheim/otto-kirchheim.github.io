import { describe, expect, it } from 'bun:test';
import { LreType } from '@otto-kirchheim/nebengeld-shared';
import dayjs from '@/shared/lib/date/configDayjs';
import {
  type BackendBereitschaftseinsatz,
  type BackendBereitschaftszeitraum,
  beFromBackend,
  beToBackend,
  bzFromBackend,
  bzToBackend,
} from '@/features/ber/model/backend';
import type { IDatenBE, IDatenBZ } from '@/shared/types';

// ─── bzFromBackend / bzToBackend ─────────────────────────

describe('fieldMapper – BZ (Bereitschaftszeitraum)', () => {
  const backendBZ: BackendBereitschaftszeitraum = {
    _id: 'bz1',
    Monat: 4,
    Jahr: 2024,
    Beginn: '2024-04-12T13:45:00.000Z',
    Ende: '2024-04-19T05:00:00.000Z',
    Pause: 30,
  };

  it('bzFromBackend konvertiert korrekt', () => {
    const result = bzFromBackend(backendBZ);
    expect(result).toEqual({
      _id: 'bz1',
      Beginn: '2024-04-12T13:45:00.000Z',
      Ende: '2024-04-19T05:00:00.000Z',
      Pause: 30,
    });
  });

  it('bzFromBackend setzt Pause auf 0 wenn undefined', () => {
    const withoutPause = { ...backendBZ, Pause: undefined };
    const result = bzFromBackend(withoutPause);
    expect(result.Pause).toBe(0);
  });

  it('bzToBackend konvertiert korrekt', () => {
    const frontendBZ: IDatenBZ = {
      _id: 'bz1',
      Beginn: '2024-04-12T13:45:00.000Z',
      Ende: '2024-04-19T05:00:00.000Z',
      Pause: 30,
    };
    const result = bzToBackend(frontendBZ, 4, 2024);
    expect(result).toEqual({
      _id: 'bz1',
      Monat: 4,
      Jahr: 2024,
      Beginn: '2024-04-12T13:45:00.000Z',
      Ende: '2024-04-19T05:00:00.000Z',
      Pause: 30,
    });
  });

  it('bzToBackend fällt bei ungültigem Datum auf Monat/Jahr-Parameter zurück', () => {
    const frontendBZ: IDatenBZ = {
      _id: 'bz-invalid',
      Beginn: 'not-a-valid-date',
      Ende: '2024-04-19T05:00:00.000Z',
      Pause: 0,
    };
    const result = bzToBackend(frontendBZ, 7, 2025);
    expect(result.Monat).toBe(7);
    expect(result.Jahr).toBe(2025);
  });

  it('bzToBackend → bzFromBackend Roundtrip', () => {
    const original: IDatenBZ = {
      _id: 'rt1',
      Beginn: '2024-01-01T00:00:00Z',
      Ende: '2024-01-07T12:00:00Z',
      Pause: 15,
    };
    const backend = bzToBackend(original, 1, 2024);
    const roundtripped = bzFromBackend(backend);
    expect(roundtripped).toEqual(original);
  });
});

// ─── beFromBackend / beToBackend ─────────────────────────

describe('fieldMapper – BE (Bereitschaftseinsatz)', () => {
  const backendBE: BackendBereitschaftseinsatz = {
    _id: 'be1',
    Monat: 4,
    Jahr: 2024,
    Tag: '2024-04-15T00:00:00.000Z',
    Auftragsnummer: 'AUF-123',
    Beginn: '08:00',
    Ende: '16:30',
    LRE: LreType.LRE_1,
    PrivatKm: 25,
  };

  it('beFromBackend konvertiert korrekt', () => {
    const result = beFromBackend(backendBE);
    expect(result._id).toBe('be1');
    expect(result.Tag).toBe(dayjs('2024-04-15T00:00:00.000Z').format('DD.MM.YYYY'));
    expect(result.Auftragsnummer).toBe('AUF-123');
    expect(result.Beginn).toBe('08:00');
    expect(result.Ende).toBe('16:30');
    expect(result.LRE).toBe(LreType.LRE_1);
    expect(result.PrivatKm).toBe(25);
  });

  it('beToBackend konvertiert Tag ins ISO-Format', () => {
    const frontendBE: IDatenBE = {
      _id: 'be1',
      Tag: '15.04.2024',
      Auftragsnummer: 'AUF-123',
      Beginn: '08:00',
      Ende: '16:30',
      LRE: LreType.LRE_1,
      PrivatKm: 25,
    };
    const result = beToBackend(frontendBE, 4, 2024);
    expect(result._id).toBe('be1');
    expect(result.Monat).toBe(4);
    expect(result.Jahr).toBe(2024);
    expect(result.Auftragsnummer).toBe('AUF-123');
    expect(result.Beginn).toBe('08:00');
    expect(result.Ende).toBe('16:30');
    expect(result.LRE).toBe(LreType.LRE_1);
    expect(result.PrivatKm).toBe(25);
    // Tag sollte ein ISO-String sein
    expect(dayjs(result.Tag).isValid()).toBe(true);
  });
});
