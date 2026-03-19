import { beforeEach, describe, expect, it } from 'vitest';

import type { IDatenEWT, IDatenEWTJahr } from '../src/ts/interfaces';
import DataE from '../src/ts/EWT/utils/DataE';
import Storage from '../src/ts/utilities/Storage';

function createRow(day: string): IDatenEWT {
  return {
    tagE: day,
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

describe('DataE', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('gibt [] zurueck wenn kein Benutzer vorhanden ist', () => {
    expect(DataE()).toEqual([]);
  });

  it('gibt uebergebene Daten direkt zurueck wenn Benutzer vorhanden ist', () => {
    Storage.set('Benutzer', { id: 'u1' });
    const data = [createRow('2026-03-10')];

    expect(DataE(data, 3)).toEqual(data);
  });

  it('gibt [] zurueck wenn weder Monat noch gespeicherter Monat vorhanden ist', () => {
    Storage.set('Benutzer', { id: 'u1' });

    expect(DataE()).toEqual([]);
  });

  it('liest Monat aus Storage und gibt dataE[Monat] zurueck', () => {
    Storage.set('Benutzer', { id: 'u1' });
    Storage.set('Monat', 3);

    const monat3 = [createRow('2026-03-11')];
    const dataE = {
      3: monat3,
    } as unknown as IDatenEWTJahr;

    Storage.set('dataE', dataE);

    expect(DataE()).toEqual(monat3);
  });

  it('gibt [] zurueck wenn dataE nicht vorhanden ist', () => {
    Storage.set('Benutzer', { id: 'u1' });
    Storage.set('Monat', 3);

    expect(DataE()).toEqual([]);
  });

  it('nutzt uebergebenen Monat anstelle des Storage-Monats', () => {
    Storage.set('Benutzer', { id: 'u1' });
    Storage.set('Monat', 4);

    const monat3 = [createRow('2026-03-15')];
    const monat4 = [createRow('2026-04-15')];
    const dataE = {
      3: monat3,
      4: monat4,
    } as unknown as IDatenEWTJahr;

    Storage.set('dataE', dataE);

    expect(DataE(undefined, 3)).toEqual(monat3);
  });
});
