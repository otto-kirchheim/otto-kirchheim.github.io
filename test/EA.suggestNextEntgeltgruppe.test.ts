import { describe, expect, it } from 'bun:test';

import type { IVorgabenU } from '@/core/types';
import { suggestNextEntgeltgruppe } from '@/features/EA/components/createAddModalEA';

function createVorgabenU(entgeltgruppe?: string): IVorgabenU {
  return {
    Pers: { Entgeltgruppe: entgeltgruppe } as IVorgabenU['Pers'],
  } as IVorgabenU;
}

describe('suggestNextEntgeltgruppe', () => {
  it('verringert eine numerische Basis-Entgeltgruppe um 1', () => {
    expect(suggestNextEntgeltgruppe(createVorgabenU('104'))).toBe('103');
  });

  it('liefert leeren String, wenn keine Basis-Entgeltgruppe gepflegt ist', () => {
    expect(suggestNextEntgeltgruppe(createVorgabenU(undefined))).toBe('');
  });

  it('liefert leeren String bei nicht-numerischer Basis-Entgeltgruppe', () => {
    expect(suggestNextEntgeltgruppe(createVorgabenU('A8'))).toBe('');
  });
});
