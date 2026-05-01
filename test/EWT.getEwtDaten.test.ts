import { beforeEach, describe, expect, it } from 'bun:test';

import type { IDatenEWT } from '@/core/types';
import Storage from '@/infrastructure/storage/Storage';
import { getEwtDaten } from '@/features/EWT/utils';

function createRow(day: string): IDatenEWT {
  return {
    tagE: day,
    buchungstagE: day,
    eOrtE: 'Fulda',
    schichtE: 'T',
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
}

describe('getEwtDaten', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('gibt [] zurueck wenn kein Benutzer vorhanden ist', () => {
    expect(getEwtDaten()).toEqual([]);
  });

  it('gibt uebergebene Daten direkt zurueck wenn Benutzer vorhanden ist', () => {
    Storage.set('Benutzer', { id: 'u1' });
    const data = [createRow('2026-03-10')];

    expect(getEwtDaten(data, 3)).toEqual(data);
  });

  it('gibt [] zurueck wenn weder Monat noch gespeicherter Monat vorhanden ist', () => {
    Storage.set('Benutzer', { id: 'u1' });

    expect(getEwtDaten()).toEqual([]);
  });

  it('liest Monat aus Storage und gibt getEwtDaten[Monat] zurueck', () => {
    Storage.set('Benutzer', { id: 'u1' });
    Storage.set('Monat', 3);

    const monat3 = [createRow('2026-03-11')];
    const dataE = {
      3: monat3,
    };

    Storage.set('dataE', dataE);

    expect(getEwtDaten()).toEqual(monat3);
  });

  it('gibt [] zurueck wenn dataE nicht vorhanden ist', () => {
    Storage.set('Benutzer', { id: 'u1' });
    Storage.set('Monat', 3);

    expect(getEwtDaten()).toEqual([]);
  });

  it('nutzt uebergebenen Monat anstelle des Storage-Monats', () => {
    Storage.set('Benutzer', { id: 'u1' });
    Storage.set('Monat', 4);

    const monat3 = [createRow('2026-03-15')];
    const monat4 = [createRow('2026-04-15')];
    const dataE = {
      3: monat3,
      4: monat4,
    };

    Storage.set('dataE', dataE);

    expect(getEwtDaten(undefined, 3)).toEqual(monat3);
  });

  it('enthaelt Eintrag auch im Buchungstag-Monat', () => {
    Storage.set('Benutzer', { id: 'u1' });
    Storage.set('Monat', 4);

    const row = createRow('2026-03-31');
    row.buchungstagE = '2026-04-01';
    Storage.set('dataE', [row]);

    expect(getEwtDaten(undefined, 4)).toEqual([row]);
    expect(getEwtDaten(undefined, 3)).toEqual([row]);
  });
});
