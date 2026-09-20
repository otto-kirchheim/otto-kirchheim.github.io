import { describe, expect, it } from 'bun:test';
import { ezAbgeleiteteWerte } from '@/features/Neben/utils/pdfDaten';

describe('ezAbgeleiteteWerte', () => {
  it('verkettet Beginn und Ende mit Bindestrich', () => {
    expect(ezAbgeleiteteWerte({ Beginn: '07:00', Ende: '15:45' }).Arbeitszeit).toBe('07:00-15:45');
  });

  it('keine Sonderbehandlung über Mitternacht -- reine Textverkettung', () => {
    expect(ezAbgeleiteteWerte({ Beginn: '23:00', Ende: '01:00' }).Arbeitszeit).toBe('23:00-01:00');
  });
});
