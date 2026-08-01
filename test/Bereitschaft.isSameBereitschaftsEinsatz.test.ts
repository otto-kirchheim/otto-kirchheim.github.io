import { describe, expect, it } from 'bun:test';
import { LreType } from '@otto-kirchheim/nebengeld-shared';
import type { IDatenBE } from '@/core/types';
import isSameBereitschaftsEinsatz from '@/features/Bereitschaft/utils/isSameBereitschaftsEinsatz';

function createBereitschaftsEinsatz(overrides: Partial<IDatenBE> = {}): IDatenBE {
  return {
    Tag: '14.04.2026',
    Auftragsnummer: 'A-1',
    Beginn: '08:00',
    Ende: '10:00',
    LRE: LreType.LRE_2,
    PrivatKm: 0,
    ...overrides,
  };
}

describe('isSameBereitschaftsEinsatz', () => {
  it('erkennt dieselbe lokale Zeile ohne _id ueber Objektidentitaet', () => {
    const current = createBereitschaftsEinsatz();

    expect(isSameBereitschaftsEinsatz(current, current)).toBe(true);
  });

  it('erkennt dieselbe persistierte Zeile ueber _id', () => {
    const current = createBereitschaftsEinsatz({ _id: 'be-1' });
    const candidate = createBereitschaftsEinsatz({ _id: 'be-1' });

    expect(isSameBereitschaftsEinsatz(candidate, current)).toBe(true);
  });

  it('erkennt dieselbe Zeile bei lokaler Duplikatkopie ohne _id ueber den Datensatzinhalt', () => {
    const current = createBereitschaftsEinsatz({ _id: 'be-1', Bereitschaftszeitraum: ['bz-1'] });
    const candidate = createBereitschaftsEinsatz({ Bereitschaftszeitraum: ['bz-1'] });

    expect(isSameBereitschaftsEinsatz(candidate, current)).toBe(true);
  });

  it('haelt verschiedene lokale Zeilen ohne _id getrennt', () => {
    const current = createBereitschaftsEinsatz();
    const candidate = createBereitschaftsEinsatz({ Beginn: '11:00', Ende: '12:00' });

    expect(isSameBereitschaftsEinsatz(candidate, current)).toBe(false);
  });
});
