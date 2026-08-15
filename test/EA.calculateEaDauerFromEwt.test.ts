import { describe, expect, it } from 'bun:test';
import calculateEaDauerFromEwt from '@/features/EA/utils/calculateEaDauerFromEwt';

describe('#calculateEaDauerFromEwt', () => {
  it('zieht keine Pause ab, wenn die Arbeitszeit unter 6 Stunden liegt', () => {
    // 5h = 300 Minuten
    expect(calculateEaDauerFromEwt({ beginE: '07:00', endeE: '12:00' })).toBe('05:00');
  });

  it('zieht keine Pause ab knapp unter der 6h-Grenze (359 Minuten)', () => {
    expect(calculateEaDauerFromEwt({ beginE: '07:00', endeE: '12:59' })).toBe('05:59');
  });

  it('zieht 30 Minuten Pause ab genau an der 6h-Grenze (360 Minuten)', () => {
    expect(calculateEaDauerFromEwt({ beginE: '07:00', endeE: '13:00' })).toBe('05:30');
  });

  it('zieht 30 Minuten Pause ab im 6-9h-Band', () => {
    // 7h = 420 Minuten roh, 30 Minuten Pause → 390 Minuten
    expect(calculateEaDauerFromEwt({ beginE: '07:00', endeE: '14:00' })).toBe('06:30');
  });

  it('zieht weiterhin nur 30 Minuten Pause ab knapp unter der 9h-Grenze (539 Minuten)', () => {
    expect(calculateEaDauerFromEwt({ beginE: '06:00', endeE: '14:59' })).toBe('08:29');
  });

  it('zieht 45 Minuten Pause ab genau an der 9h-Grenze (540 Minuten) — ersetzt die 30, addiert sich nicht', () => {
    // 9h = 540 Minuten roh, 45 Minuten Pause → 495 Minuten
    expect(calculateEaDauerFromEwt({ beginE: '06:00', endeE: '15:00' })).toBe('08:15');
  });

  it('zieht 45 Minuten Pause ab im 9h+-Band', () => {
    // 10h = 600 Minuten roh, 45 Minuten Pause → 555 Minuten
    expect(calculateEaDauerFromEwt({ beginE: '06:00', endeE: '16:00' })).toBe('09:15');
  });

  it('berechnet korrekt über Mitternacht hinweg (Nachtschicht)', () => {
    // 19:30 -> 06:15 (Folgetag) = 10h45m = 645 Minuten roh, 45 Minuten Pause → 600 Minuten
    expect(calculateEaDauerFromEwt({ beginE: '19:30', endeE: '06:15' })).toBe('10:00');
  });
});
