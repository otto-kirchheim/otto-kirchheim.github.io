import './setupBun';
import { beforeEach, describe, expect, it } from 'bun:test';

import type { IDatenBZ, IVorgabenU, IVorgabenUvorgabenB, ISchichtZeiten } from '@/core/types';
import calculateBereitschaftsZeiten from '@/features/Bereitschaft/utils/calculateBereitschaftsZeiten';
import dayjs from '@/infrastructure/date/configDayjs';
import Storage from '@/infrastructure/storage/Storage';

type SchichtFlags = {
  nacht: boolean;
  spaet: boolean;
  sonder: boolean;
};

function setMatrixVorgabenU(): void {
  Storage.set('VorgabenU', {
    Arbeitszeit: {
      frueh: {
        aktiv: true,
        default: { beginn: '07:00', ende: '15:45', pause: 30 },
        regelarbeitstage: [1, 2, 3, 4, 5],
      },
      spaet: {
        aktiv: true,
        default: { beginn: '14:00', ende: '22:00', pause: 30 },
        regelarbeitstage: [1, 2, 3, 4, 5],
      },
      nacht: {
        aktiv: true,
        default: { beginn: '19:45', ende: '06:15', pause: 45 },
        regelarbeitstage: [7, 1, 2, 3],
      },
      sonder: { aktiv: true, beginn: '20:15', ende: '07:00', pause: 20 },
      fahrzeit: '00:00',
    },
    Pers: { Bundesland: 'HE' },
  } as unknown as IVorgabenU);
}

const bereitschaftsAnfang = dayjs('2026-04-14T06:00:00');
const bereitschaftsEnde = dayjs('2026-04-15T17:00:00');
const nachtAnfang = dayjs('2026-04-14T19:45:00');
const nachtEnde = dayjs('2026-04-15T06:15:00');
const sonderRange = {
  von: dayjs('2026-04-14T00:00:00'),
  bis: dayjs('2026-04-15T23:59:59'),
};

function runCase(
  flags: SchichtFlags,
  overrides?: IVorgabenUvorgabenB['schichtenOverrides'],
  sonderOverride?: ISchichtZeiten,
): IDatenBZ[] {
  const result = calculateBereitschaftsZeiten(
    bereitschaftsAnfang,
    bereitschaftsEnde,
    nachtAnfang,
    nachtEnde,
    flags.nacht,
    flags.spaet,
    flags.sonder,
    sonderRange,
    [],
    overrides,
    sonderOverride,
  );

  if (!result) throw new Error('Berechnung lieferte false');
  return result;
}

function beginZeiten(rows: IDatenBZ[]): string[] {
  return rows.map(row => dayjs(row.Beginn).format('HH:mm'));
}

function serializeRows(rows: IDatenBZ[]): Array<{ Beginn: string; Ende: string; Pause: number }> {
  return rows.map(row => ({
    Beginn: dayjs(row.Beginn).format('YYYY-MM-DD HH:mm'),
    Ende: dayjs(row.Ende).format('YYYY-MM-DD HH:mm'),
    Pause: row.Pause,
  }));
}

describe('Bereitschaftseingaben - Schichtzusammensetzungen ohne Override', () => {
  beforeEach(() => {
    localStorage.clear();
    setMatrixVorgabenU();
  });

  const combinations: Array<{ name: string; flags: SchichtFlags }> = [
    { name: 'nur-frueh', flags: { nacht: false, spaet: false, sonder: false } },
    { name: 'frueh-spaet', flags: { nacht: false, spaet: true, sonder: false } },
    { name: 'frueh-nacht', flags: { nacht: true, spaet: false, sonder: false } },
    { name: 'frueh-spaet-nacht', flags: { nacht: true, spaet: true, sonder: false } },
    { name: 'frueh-sonder', flags: { nacht: false, spaet: false, sonder: true } },
    { name: 'frueh-spaet-sonder', flags: { nacht: false, spaet: true, sonder: true } },
    { name: 'frueh-nacht-sonder', flags: { nacht: true, spaet: false, sonder: true } },
    { name: 'frueh-spaet-nacht-sonder', flags: { nacht: true, spaet: true, sonder: true } },
  ];

  for (const combination of combinations) {
    it(`berechnet Kombination ${combination.name} stabil`, () => {
      const rows = runCase(combination.flags);
      expect(rows.length).toBeGreaterThan(0);
      expect(serializeRows(rows)).toMatchSnapshot();
    });
  }
});

describe('Bereitschaftseingaben - verschiedene Overrides', () => {
  beforeEach(() => {
    localStorage.clear();
    setMatrixVorgabenU();
  });

  it('Frueh-Override verschiebt den Beginn von 15:45 auf 16:30', () => {
    const ohne = runCase({ nacht: false, spaet: false, sonder: false });
    const mit = runCase(
      { nacht: false, spaet: false, sonder: false },
      { frueh: { overrides: { 2: { ende: '16:30' } } } },
    );

    expect(beginZeiten(ohne)).toContain('15:45');
    expect(beginZeiten(mit)).toContain('16:30');
  });

  it('Spaet-Override verschiebt den Beginn von 22:00 auf 23:30', () => {
    const ohne = runCase({ nacht: false, spaet: true, sonder: false });
    const mit = runCase(
      { nacht: false, spaet: true, sonder: false },
      { spaet: { overrides: { 2: { ende: '23:30' } } } },
    );

    expect(beginZeiten(ohne)).toContain('22:00');
    expect(beginZeiten(mit)).toContain('23:30');
  });

  it('Nacht-Override verschiebt den Beginn von 06:15 auf 05:00 und uebernimmt Pause', () => {
    const ohne = runCase({ nacht: true, spaet: false, sonder: false });
    const mit = runCase(
      { nacht: true, spaet: false, sonder: false },
      { nacht: { overrides: { 2: { ende: '05:00', pause: 60 } } } },
    );

    expect(beginZeiten(ohne)).toContain('06:15');
    expect(beginZeiten(mit)).toContain('05:00');
    expect(mit.find(row => dayjs(row.Beginn).format('HH:mm') === '05:00')?.Pause).toBe(60);
  });

  it('Sonder-Override (Runtime) verschiebt den Beginn von 07:00 auf 08:00', () => {
    const ohne = runCase({ nacht: false, spaet: false, sonder: true });
    const mit = runCase({ nacht: false, spaet: false, sonder: true }, undefined, {
      aktiv: true,
      beginn: '21:00',
      ende: '08:00',
      pause: 10,
    });

    expect(beginZeiten(ohne)).toContain('07:00');
    expect(beginZeiten(mit)).toContain('08:00');
  });

  it('kombinierte Overrides fuer Frueh/ Spaet/ Nacht/ Sonder bleiben stabil', () => {
    const rows = runCase(
      { nacht: true, spaet: true, sonder: true },
      {
        frueh: { overrides: { 2: { ende: '16:10', pause: 25 } } },
        spaet: { overrides: { 2: { ende: '23:10', pause: 35 } } },
        nacht: { overrides: { 2: { ende: '05:20', pause: 50 } } },
      },
      { aktiv: true, beginn: '20:45', ende: '07:30', pause: 15 },
    );

    expect(rows.length).toBeGreaterThan(0);
    expect(serializeRows(rows)).toMatchSnapshot();
  });
});
