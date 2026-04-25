import { describe, expect, it } from 'bun:test';
import type { IDatenBE } from '../src/ts/core/types';
import isSameBereitschaftsEinsatz from '../src/ts/features/Bereitschaft/utils/isSameBereitschaftsEinsatz';

function createBereitschaftsEinsatz(overrides: Partial<IDatenBE> = {}): IDatenBE {
  return {
    tagBE: '14.04.2026',
    auftragsnummerBE: 'A-1',
    beginBE: '08:00',
    endeBE: '10:00',
    lreBE: 'LRE 2',
    privatkmBE: 0,
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
    const current = createBereitschaftsEinsatz({ _id: 'be-1', bereitschaftszeitraumBE: 'bz-1' });
    const candidate = createBereitschaftsEinsatz({ bereitschaftszeitraumBE: 'bz-1' });

    expect(isSameBereitschaftsEinsatz(candidate, current)).toBe(true);
  });

  it('haelt verschiedene lokale Zeilen ohne _id getrennt', () => {
    const current = createBereitschaftsEinsatz();
    const candidate = createBereitschaftsEinsatz({ beginBE: '11:00', endeBE: '12:00' });

    expect(isSameBereitschaftsEinsatz(candidate, current)).toBe(false);
  });
});
