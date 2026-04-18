import { beforeEach, describe, expect, it, vi } from 'bun:test';
import type { IDatenBE, IDatenBZ } from '../src/ts/interfaces';
import Storage from '../src/ts/utilities/Storage';

const {
  calculateBereitschaftsZeitenMock,
  getBereitschaftsEinsatzDatenMock,
  getBereitschaftsZeitraumDatenMock,
  persistBereitschaftsEinsatzTableDataMock,
  createSnackBarMock,
  publishDataChangedMock,
} = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  calculateBereitschaftsZeitenMock: vi.fn(),
  getBereitschaftsEinsatzDatenMock: vi.fn(),
  getBereitschaftsZeitraumDatenMock: vi.fn(),
  persistBereitschaftsEinsatzTableDataMock: vi.fn(),
  createSnackBarMock: vi.fn(),
  publishDataChangedMock: vi.fn(),
}));

vi.mock('../src/ts/Bereitschaft/utils', () => ({
  calculateBereitschaftsZeiten: calculateBereitschaftsZeitenMock,
  getBereitschaftsEinsatzDaten: getBereitschaftsEinsatzDatenMock,
  getBereitschaftsZeitraumDaten: getBereitschaftsZeitraumDatenMock,
  persistBereitschaftsEinsatzTableData: persistBereitschaftsEinsatzTableDataMock,
}));

vi.mock('../src/ts/class/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

vi.mock('../src/ts/core', () => ({
  publishDataChanged: publishDataChangedMock,
}));

import submitBereitschaftsEinsatz from '../src/ts/Bereitschaft/utils/submitBereitschaftsEinsatz';

function createModal(overrides: Partial<Record<string, string | boolean>> = {}): HTMLDivElement {
  const modal = document.createElement('div');
  const vals = {
    Datum: '2023-04-12',
    SAPNR: 'SAP-123',
    ZeitVon: '09:00',
    ZeitBis: '12:00',
    LRE: 'LRE 1',
    privatkm: '0',
    berZeit: false,
    ...overrides,
  };

  for (const [id, value] of Object.entries(vals)) {
    if (typeof value === 'boolean') {
      const el = document.createElement('input');
      el.id = id;
      el.type = 'checkbox';
      if (value) el.checked = true;
      modal.appendChild(el);
    } else if (id === 'LRE') {
      const el = document.createElement('select');
      el.id = id;
      const opt = document.createElement('option');
      opt.value = value as string;
      opt.selected = true;
      el.appendChild(opt);
      modal.appendChild(el);
    } else {
      const el = document.createElement('input');
      el.id = id;
      (el as HTMLInputElement).value = value as string;
      modal.appendChild(el);
    }
  }
  return modal;
}

function createBZ(beginB: string, endeB: string, id?: string): IDatenBZ {
  return { beginB, endeB, pauseB: 0, ...(id ? { _id: id } : {}) } as IDatenBZ;
}

function createTableBEMock() {
  const addMock = vi.fn();
  const ftBE = { rows: { add: addMock } };
  const table = document.createElement('table') as HTMLTableElement & { instance: typeof ftBE };
  table.id = 'tableBE';
  table.instance = ftBE;
  return { table: table as never, addMock };
}

function createTableBZMock() {
  const loadSmartMock = vi.fn();
  const setFilterMock = vi.fn();
  const ftBZ = { rows: { loadSmart: loadSmartMock, setFilter: setFilterMock } };
  const table = document.createElement('table') as HTMLTableElement & { instance: typeof ftBZ };
  table.id = 'tableBZ';
  table.instance = ftBZ;
  return { table: table as never, loadSmartMock, setFilterMock };
}

describe('submitBereitschaftsEinsatz', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    localStorage.clear();
    getBereitschaftsEinsatzDatenMock.mockReturnValue([]);
    getBereitschaftsZeitraumDatenMock.mockReturnValue([]);
  });

  it('wirft Fehler wenn Eingabefelder fehlen', () => {
    const modal = document.createElement('div');
    const { table: tableBE } = createTableBEMock();
    const { table: tableBZ } = createTableBZMock();
    expect(() => submitBereitschaftsEinsatz(modal, tableBE, tableBZ)).toThrow('Input Element nicht gefunden');
  });

  it('wirft Fehler bei unbekanntem LRE', () => {
    const modal = createModal({ LRE: 'LRE 99' });
    const { table: tableBE } = createTableBEMock();
    const { table: tableBZ } = createTableBZMock();
    expect(() => submitBereitschaftsEinsatz(modal, tableBE, tableBZ)).toThrow('LRE unbekannt');
  });

  it('gibt false zurück wenn kein passender Bereitschaftszeitraum gefunden', () => {
    const modal = createModal();
    const { table: tableBE } = createTableBEMock();
    const { table: tableBZ } = createTableBZMock();
    getBereitschaftsZeitraumDatenMock.mockReturnValue([]);

    const result = submitBereitschaftsEinsatz(modal, tableBE, tableBZ);

    expect(result).toBe(false);
    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'warning' }));
  });

  it('gibt false zurück wenn Einsatz in Lücke zwischen zwei Zeiträumen liegt', () => {
    const modal = createModal({ ZeitVon: '09:00', ZeitBis: '20:00' });
    const { table: tableBE } = createTableBEMock();
    const { table: tableBZ } = createTableBZMock();

    // BZ1 starts at 07:00Z (= 09:00 CEST) so einsatzStart (09:00 CEST = 07:00Z) matches the start of BZ1.
    // BZ2 covers the end range but there is a gap between BZ1 and BZ2 (12:00Z–15:00Z).
    const bz1 = createBZ('2023-04-12T07:00:00.000Z', '2023-04-12T12:00:00.000Z', 'bz1');
    const bz2 = createBZ('2023-04-12T15:00:00.000Z', '2023-04-12T21:00:00.000Z', 'bz2');
    getBereitschaftsZeitraumDatenMock.mockReturnValue([bz1, bz2]);

    const result = submitBereitschaftsEinsatz(modal, tableBE, tableBZ);

    expect(result).toBe(false);
    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'warning' }));
  });

  it('gibt false zurück wenn Einsatz sich mit bestehendem überschneidet', () => {
    const modal = createModal({ ZeitVon: '09:00', ZeitBis: '12:00' });
    const { table: tableBE } = createTableBEMock();
    const { table: tableBZ } = createTableBZMock();

    // BZ starts at 07:00Z (= 09:00 CEST) so einsatzStart (09:00 CEST = 07:00Z) is within the BZ.
    const bz = createBZ('2023-04-12T07:00:00.000Z', '2023-04-12T23:00:00.000Z', 'bz1');
    getBereitschaftsZeitraumDatenMock.mockReturnValue([bz]);

    const existingBE: Partial<IDatenBE> = { tagBE: '12.04.2023', beginBE: '10:00', endeBE: '13:00', lreBE: 'LRE 2' };
    getBereitschaftsEinsatzDatenMock.mockReturnValue([existingBE]);

    const result = submitBereitschaftsEinsatz(modal, tableBE, tableBZ);

    expect(result).toBe(false);
    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'warning' }));
  });

  it('fügt Bereitschaftseinsatz hinzu und gibt true zurück', () => {
    const modal = createModal({ ZeitVon: '09:00', ZeitBis: '12:00' });
    const { table: tableBE, addMock } = createTableBEMock();
    const { table: tableBZ } = createTableBZMock();

    // BZ starts at 07:00Z (= 09:00 CEST) so einsatzStart (09:00 CEST = 07:00Z) is within the BZ.
    const bz = createBZ('2023-04-12T07:00:00.000Z', '2023-04-12T23:00:00.000Z', 'bz1');
    getBereitschaftsZeitraumDatenMock.mockReturnValue([bz]);

    const result = submitBereitschaftsEinsatz(modal, tableBE, tableBZ);

    expect(result).toBe(true);
    expect(addMock).toHaveBeenCalledWith(
      expect.objectContaining({ tagBE: '12.04.2023', beginBE: '09:00', endeBE: '12:00', lreBE: 'LRE 1' }),
    );
    expect(persistBereitschaftsEinsatzTableDataMock).toHaveBeenCalledTimes(1);
  });

  it('speichert zusätzlichen Bereitschaftszeitraum wenn berZeit aktiviert', () => {
    Storage.set('dataBZ', []);
    const modal = createModal({ ZeitVon: '09:00', ZeitBis: '12:00', berZeit: true });
    const { table: tableBE } = createTableBEMock();
    const { table: tableBZ, loadSmartMock } = createTableBZMock();

    // BZ starts at 07:00Z (= 09:00 CEST) so einsatzStart (09:00 CEST = 07:00Z) is within the BZ.
    const bz = createBZ('2023-04-12T07:00:00.000Z', '2023-04-12T23:00:00.000Z', 'bz1');
    getBereitschaftsZeitraumDatenMock.mockReturnValue([bz]);
    calculateBereitschaftsZeitenMock.mockReturnValue([
      { beginB: '2023-04-12T09:00:00.000Z', endeB: '2023-04-12T12:00:00.000Z', pauseB: 0 },
    ]);

    const result = submitBereitschaftsEinsatz(modal, tableBE, tableBZ);

    expect(result).toBe(true);
    expect(publishDataChangedMock).toHaveBeenCalledTimes(1);
    expect(loadSmartMock).toHaveBeenCalledTimes(1);
  });
});
