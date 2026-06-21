import { describe, expect, it } from 'bun:test';

import type { IVorgabenUaZ, IVorgabenUvorgabenB } from '@/core/types';
import { resolveBzBis, resolveBzVon } from '@/features/Bereitschaft/utils/resolveBereitschaftsGrenze';

function createAZ(): IVorgabenUaZ {
  return {
    frueh: {
      aktiv: true,
      default: { beginn: '07:00', ende: '15:45', pause: 30 },
      overrides: { 5: { ende: '13:00', pause: 0 } },
    },
    spaet: { aktiv: true, default: { beginn: '13:45', ende: '22:00', pause: 30 } },
    nacht: { aktiv: true, default: { beginn: '19:45', ende: '06:15', pause: 45 } },
    sonder: { aktiv: false, beginn: '20:15', ende: '07:00', pause: 20 },
    fahrzeit: '00:20',
  };
}

describe('resolveBzVon', () => {
  it('nutzt frueh.Ende des Wochentags (Mo)', () => {
    expect(resolveBzVon(createAZ(), undefined, 1, false)).toBe('15:45');
  });

  it('berücksichtigt frueh-Override (Fr → 13:00)', () => {
    expect(resolveBzVon(createAZ(), undefined, 5, false)).toBe('13:00');
  });

  it('nutzt spaet.Ende, wenn Spätschicht aktiv ist', () => {
    expect(resolveBzVon(createAZ(), undefined, 1, true)).toBe('22:00');
  });

  it('fällt auf frueh.Ende zurück, wenn Spät am Tag arbeitsfrei ist', () => {
    const az = createAZ();
    az.spaet = { aktiv: true, default: { beginn: '13:45', ende: '22:00', pause: 30 }, regelarbeitstage: [1, 2, 3] };
    // Samstag (6) ist kein Spät-Regelarbeitstag, aber auch kein Früh-Regelarbeitstag → 08:00
    expect(resolveBzVon(az, undefined, 6, true)).toBe('08:00');
    // Donnerstag (4): Spät arbeitsfrei → Früh.Ende
    expect(resolveBzVon(az, undefined, 4, true)).toBe('15:45');
  });

  it('liefert 08:00 an arbeitsfreien Tagen (Sa) und ohne aZ', () => {
    expect(resolveBzVon(createAZ(), undefined, 6, false)).toBe('08:00');
    expect(resolveBzVon(undefined, undefined, 1, false)).toBe('08:00');
  });

  it('berücksichtigt per-Variante schichtenOverrides (frueh)', () => {
    const ov: IVorgabenUvorgabenB['schichtenOverrides'] = { frueh: { overrides: { 2: { ende: '16:30' } } } };
    expect(resolveBzVon(createAZ(), ov, 2, false)).toBe('16:30');
  });
});

describe('resolveBzBis', () => {
  it('nutzt frueh.Beginn des Wochentags', () => {
    expect(resolveBzBis(createAZ(), undefined, 3)).toBe('07:00');
  });

  it('liefert 08:00 an arbeitsfreien Tagen und ohne aZ', () => {
    expect(resolveBzBis(createAZ(), undefined, 7)).toBe('08:00');
    expect(resolveBzBis(undefined, undefined, 3)).toBe('08:00');
  });

  it('ignoriert aktive Spätschicht (Ende bleibt frueh.Beginn)', () => {
    const ov: IVorgabenUvorgabenB['schichtenOverrides'] = { frueh: { overrides: { 1: { beginn: '06:30' } } } };
    expect(resolveBzBis(createAZ(), ov, 1)).toBe('06:30');
  });
});
