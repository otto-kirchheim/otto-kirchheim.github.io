import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { LreType } from '@otto-kirchheim/nebengeld-shared';
import type { IDatenBE, IDatenBZ } from '@/core/types';

// In-memory storage used by the Storage mock (shared via closure with the vi.mock factory below)
const storageStore = new Map<string, unknown>();

const {
  calculateBereitschaftsZeitenMock,
  getBereitschaftsEinsatzDatenMock,
  getBereitschaftsZeitraumDatenMock,
  persistBereitschaftsEinsatzTableDataMock,
  createSnackBarMock,
  publishDataChangedMock,
  flushResourceMock,
  scheduleAutoSaveMock,
  setLoadingMock,
  clearLoadingMock,
} = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  calculateBereitschaftsZeitenMock: vi.fn(),
  getBereitschaftsEinsatzDatenMock: vi.fn(),
  getBereitschaftsZeitraumDatenMock: vi.fn(),
  persistBereitschaftsEinsatzTableDataMock: vi.fn(),
  createSnackBarMock: vi.fn(),
  publishDataChangedMock: vi.fn(),
  flushResourceMock: vi.fn(),
  scheduleAutoSaveMock: vi.fn(),
  setLoadingMock: vi.fn(),
  clearLoadingMock: vi.fn(),
}));

vi.mock('@/features/Bereitschaft/utils', () => ({
  calculateBereitschaftsZeiten: calculateBereitschaftsZeitenMock,
  getBereitschaftsEinsatzDaten: getBereitschaftsEinsatzDatenMock,
  getBereitschaftsZeitraumDaten: getBereitschaftsZeitraumDatenMock,
  persistBereitschaftsEinsatzTableData: persistBereitschaftsEinsatzTableDataMock,
  B_WECHSEL_STUNDE: 8,
  B_WECHSEL_MINUTE: 0,
}));

vi.mock('@/infrastructure/ui/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

vi.mock('@/infrastructure/ui/setLoading', () => ({
  default: setLoadingMock,
}));

vi.mock('@/infrastructure/ui/clearLoading', () => ({
  default: clearLoadingMock,
}));

vi.mock('@/infrastructure/autoSave/autoSave', () => ({
  flushResource: flushResourceMock,
  scheduleAutoSave: scheduleAutoSaveMock,
}));

vi.mock('@/core', () => ({
  publishEvent: publishDataChangedMock,
}));

vi.mock('@/infrastructure/storage/Storage', () => ({
  default: {
    get: <T>(key: string, options?: { default?: T }): T =>
      (storageStore.has(key) ? storageStore.get(key) : options?.default) as T,
    set: (key: string, value: unknown): void => {
      storageStore.set(key, value);
    },
    check: (key: string): boolean => storageStore.has(key),
    remove: (key: string): void => {
      storageStore.delete(key);
    },
  },
}));

vi.mock('@/infrastructure/date/getMonatFromItem', () => ({
  getMonatFromBZ: (item: IDatenBZ) => {
    // Return April (4) for our test BZs (2023-04-xx)
    const d = new Date(String(item.Beginn));
    return d.getMonth() + 1;
  },
}));

import submitBereitschaftsEinsatz from '@/features/Bereitschaft/utils/submitBereitschaftsEinsatz';

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

function createBZ(Beginn: string, Ende: string, id?: string): IDatenBZ {
  return { Beginn, Ende, Pause: 0, ...(id ? { _id: id } : {}) } as IDatenBZ;
}

function createTableBEMock() {
  const addMock = vi.fn();
  const loadMock = vi.fn();
  const rowsArray: { cells: IDatenBE; _state: string }[] = [];
  const ftBE = { rows: { add: addMock, load: loadMock, array: rowsArray } };
  const table = document.createElement('table') as HTMLTableElement & { instance: typeof ftBE };
  table.id = 'tableBE';
  table.instance = ftBE;
  return { table: table as never, addMock, loadMock, rowsArray };
}

function createTableBZMock() {
  const loadMock = vi.fn();
  const setFilterMock = vi.fn();
  const rowsArray: { _id?: string; _state: string }[] = [];
  const ftBZ = { rows: { load: loadMock, setFilter: setFilterMock, array: rowsArray } };
  const table = document.createElement('table') as HTMLTableElement & { instance: typeof ftBZ };
  table.id = 'tableBZ';
  table.instance = ftBZ;
  return { table: table as never, loadMock, setFilterMock, rowsArray };
}

describe('submitBereitschaftsEinsatz', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    localStorage.clear();
    storageStore.clear();
    flushResourceMock.mockResolvedValue(undefined);
    getBereitschaftsEinsatzDatenMock.mockReturnValue([]);
    getBereitschaftsZeitraumDatenMock.mockReturnValue([]);
  });

  it('wirft Fehler wenn Eingabefelder fehlen', async () => {
    const modal = document.createElement('div');
    const { table: tableBE } = createTableBEMock();
    const { table: tableBZ } = createTableBZMock();
    await expect(submitBereitschaftsEinsatz(modal, tableBE, tableBZ)).rejects.toThrow('Input Element nicht gefunden');
  });

  it('wirft Fehler bei unbekanntem LRE', async () => {
    const modal = createModal({ LRE: 'LRE 99' });
    const { table: tableBE } = createTableBEMock();
    const { table: tableBZ } = createTableBZMock();
    await expect(submitBereitschaftsEinsatz(modal, tableBE, tableBZ)).rejects.toThrow('LRE unbekannt');
  });

  it('gibt false zurück wenn kein passender Bereitschaftszeitraum gefunden', async () => {
    const modal = createModal();
    const { table: tableBE } = createTableBEMock();
    const { table: tableBZ } = createTableBZMock();
    getBereitschaftsZeitraumDatenMock.mockReturnValue([]);

    const result = await submitBereitschaftsEinsatz(modal, tableBE, tableBZ);

    expect(result).toBe(false);
    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'warning' }));
  });

  it('gibt false zurück wenn Einsatz in Lücke zwischen zwei Zeiträumen liegt', async () => {
    const modal = createModal({ ZeitVon: '09:00', ZeitBis: '20:00' });
    const { table: tableBE } = createTableBEMock();
    const { table: tableBZ } = createTableBZMock();

    const bz1 = createBZ('2023-04-12T07:00:00.000Z', '2023-04-12T12:00:00.000Z', 'bz1');
    const bz2 = createBZ('2023-04-12T15:00:00.000Z', '2023-04-12T21:00:00.000Z', 'bz2');
    getBereitschaftsZeitraumDatenMock.mockReturnValue([bz1, bz2]);

    const result = await submitBereitschaftsEinsatz(modal, tableBE, tableBZ);

    expect(result).toBe(false);
    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'warning' }));
  });

  it('gibt false zurück wenn Einsatz sich mit bestehendem überschneidet', async () => {
    const modal = createModal({ ZeitVon: '09:00', ZeitBis: '12:00' });
    const { table: tableBE } = createTableBEMock();
    const { table: tableBZ } = createTableBZMock();

    const bz = createBZ('2023-04-12T07:00:00.000Z', '2023-04-12T23:00:00.000Z', 'bz1');
    getBereitschaftsZeitraumDatenMock.mockReturnValue([bz]);

    const existingBE: Partial<IDatenBE> = {
      Tag: '12.04.2023',
      Beginn: '10:00',
      Ende: '13:00',
      LRE: LreType.LRE_2,
    };
    getBereitschaftsEinsatzDatenMock.mockReturnValue([existingBE]);

    const result = await submitBereitschaftsEinsatz(modal, tableBE, tableBZ);

    expect(result).toBe(false);
    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'warning' }));
    // Regression: lokal geloeschte, ungesynchte BE-Zeilen duerfen den Overlap-Check nicht blockieren
    // (Bug-Klasse analog zum BZ-/EWT-Fix vom 2026-07-30) – Getter wird daher mit excludeDeleted aufgerufen.
    expect(getBereitschaftsEinsatzDatenMock).toHaveBeenCalledWith(
      undefined,
      undefined,
      expect.objectContaining({ excludeDeleted: true }),
    );
  });

  it('fügt Bereitschaftseinsatz hinzu und gibt true zurück', async () => {
    const modal = createModal({ ZeitVon: '09:00', ZeitBis: '12:00' });
    const { table: tableBE, addMock } = createTableBEMock();
    const { table: tableBZ } = createTableBZMock();

    const bz = createBZ('2023-04-12T07:00:00.000Z', '2023-04-12T23:00:00.000Z', 'bz1');
    getBereitschaftsZeitraumDatenMock.mockReturnValue([bz]);

    const result = await submitBereitschaftsEinsatz(modal, tableBE, tableBZ);

    expect(result).toBe(true);
    expect(addMock).toHaveBeenCalledWith(
      expect.objectContaining({
        Tag: '12.04.2023',
        Beginn: '09:00',
        Ende: '12:00',
        LRE: LreType.LRE_1,
        Bereitschaftszeitraum: ['bz1'],
      }),
    );
    expect(persistBereitschaftsEinsatzTableDataMock).toHaveBeenCalledTimes(1);
  });

  it('setzt Bereitschaftszeitraum als Array mit zwei IDs wenn Einsatz zwei BZs überspannt', async () => {
    // bz1 07:00Z-10:00Z, bz2 10:00Z-20:00Z (adjacent). ZeitVon=09:00 (UTC 09Z in bz1), ZeitBis=13:00 (UTC 13Z in bz2).
    const modal = createModal({ ZeitVon: '09:00', ZeitBis: '13:00' });
    const { table: tableBE, addMock } = createTableBEMock();
    const { table: tableBZ } = createTableBZMock();

    const bz1 = createBZ('2023-04-12T07:00:00.000Z', '2023-04-12T10:00:00.000Z', 'bz1');
    const bz2 = createBZ('2023-04-12T10:00:00.000Z', '2023-04-12T20:00:00.000Z', 'bz2');
    getBereitschaftsZeitraumDatenMock.mockReturnValue([bz1, bz2]);

    const result = await submitBereitschaftsEinsatz(modal, tableBE, tableBZ);

    expect(result).toBe(true);
    expect(addMock).toHaveBeenCalledWith(expect.objectContaining({ Bereitschaftszeitraum: ['bz1', 'bz2'] }));
  });

  it('speichert zusätzlichen Bereitschaftszeitraum wenn berZeit aktiviert und Coverage unvollständig', async () => {
    storageStore.set('dataBZ', []);
    const modal = createModal({ ZeitVon: '09:00', ZeitBis: '12:00', berZeit: true });
    const { table: tableBE, addMock } = createTableBEMock();
    const { table: tableBZ, loadMock } = createTableBZMock();

    const bz = createBZ('2023-04-12T07:00:00.000Z', '2023-04-12T23:00:00.000Z', 'bz1');
    getBereitschaftsZeitraumDatenMock.mockReturnValueOnce([]).mockReturnValue([bz]);
    calculateBereitschaftsZeitenMock.mockReturnValue([
      { Beginn: '2023-04-12T09:00:00.000Z', Ende: '2023-04-12T12:00:00.000Z', Pause: 0 },
    ]);

    const result = await submitBereitschaftsEinsatz(modal, tableBE, tableBZ);

    expect(result).toBe(true);
    expect(loadMock).toHaveBeenCalledTimes(1);
    expect(flushResourceMock).toHaveBeenCalledWith('BZ');
    expect(addMock).toHaveBeenCalledTimes(1);
  });

  it('blockiert Submit wenn bereits ein LRE 1 im Bereitschaftszeitraum existiert', async () => {
    const bz = createBZ('2023-04-12T07:00:00.000Z', '2023-04-12T23:00:00.000Z', 'bz1');
    getBereitschaftsZeitraumDatenMock.mockReturnValue([bz]);

    const existingLre1: Partial<IDatenBE> = {
      Tag: '12.04.2023',
      Beginn: '10:00',
      Ende: '11:30',
      LRE: LreType.LRE_1,
    };
    getBereitschaftsEinsatzDatenMock.mockReturnValue([existingLre1]);

    const modal = createModal({ ZeitVon: '12:00', ZeitBis: '14:00', LRE: 'LRE 1' });
    const { table: tableBE, addMock } = createTableBEMock();
    const { table: tableBZ } = createTableBZMock();

    const result = await submitBereitschaftsEinsatz(modal, tableBE, tableBZ);

    expect(result).toBe(false);
    expect(addMock).not.toHaveBeenCalled();
    expect(createSnackBarMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'warning', message: expect.stringContaining('LRE 1') }),
    );
  });

  it('erlaubt neues LRE 1 nach 08:00 wenn vorheriges LRE 1 vor 08:00 startete', async () => {
    // BE 7:45-8:15 as LRE 1 → new LRE 1 from 8:16 is in a different window
    const bz = createBZ('2023-04-12T05:00:00.000Z', '2023-04-12T23:00:00.000Z', 'bz1');
    getBereitschaftsZeitraumDatenMock.mockReturnValue([bz]);

    // Existing LRE 1 started at 07:45 (before 08:00 cutoff)
    const existingLre1: Partial<IDatenBE> = {
      Tag: '12.04.2023',
      Beginn: '07:45',
      Ende: '08:15',
      LRE: LreType.LRE_1,
    };
    getBereitschaftsEinsatzDatenMock.mockReturnValue([existingLre1]);

    // New LRE 1 starts at 08:16 → in a DIFFERENT 08:00 window (previous was before 08:00)
    const modal = createModal({ ZeitVon: '08:16', ZeitBis: '10:00', LRE: 'LRE 1' });
    const { table: tableBE, addMock } = createTableBEMock();
    const { table: tableBZ } = createTableBZMock();

    const result = await submitBereitschaftsEinsatz(modal, tableBE, tableBZ);

    expect(result).toBe(true);
    expect(addMock).toHaveBeenCalledTimes(1);
  });

  it('ignoriert berZeit-Checkbox wenn Bereitschaftszeitraum bereits vollständig vorhanden ist', async () => {
    const bz = createBZ('2023-04-12T07:00:00.000Z', '2023-04-12T23:00:00.000Z', 'bz1');
    getBereitschaftsZeitraumDatenMock.mockReturnValue([bz]);

    const modal = createModal({ ZeitVon: '09:00', ZeitBis: '12:00', berZeit: true });
    const { table: tableBE, addMock } = createTableBEMock();
    const { table: tableBZ, loadMock } = createTableBZMock();

    const result = await submitBereitschaftsEinsatz(modal, tableBE, tableBZ);

    expect(result).toBe(true);
    expect(loadMock).not.toHaveBeenCalled();
    expect(calculateBereitschaftsZeitenMock).not.toHaveBeenCalled();
    expect(addMock).toHaveBeenCalledTimes(1);
    expect(createSnackBarMock).not.toHaveBeenCalled();
  });

  describe('Erzwungene Reihenfolge bei ungesynctem BZ (direkt nacheinander BZ dann BE angelegt)', () => {
    it('synct passenden Bereitschaftszeitraum zuerst wenn er lokal noch keine ID hat', async () => {
      const modal = createModal({ ZeitVon: '09:00', ZeitBis: '12:00' });
      const { table: tableBE, addMock } = createTableBEMock();
      const { table: tableBZ } = createTableBZMock();

      const unsyncedBz = createBZ('2023-04-12T07:00:00.000Z', '2023-04-12T23:00:00.000Z');
      const syncedBz = createBZ('2023-04-12T07:00:00.000Z', '2023-04-12T23:00:00.000Z', 'bz1');
      getBereitschaftsZeitraumDatenMock.mockReturnValueOnce([unsyncedBz]).mockReturnValue([syncedBz]);

      const result = await submitBereitschaftsEinsatz(modal, tableBE, tableBZ);

      expect(flushResourceMock).toHaveBeenCalledWith('BZ');
      expect(result).toBe(true);
      expect(addMock).toHaveBeenCalledWith(expect.objectContaining({ Bereitschaftszeitraum: ['bz1'] }));
    });

    it('speichert BE trotzdem (ohne BZ-Referenz), wenn der Zeitraum auch nach dem Sync-Versuch keine ID hat -- Speichern darf nie fehlschlagen', async () => {
      const modal = createModal({ ZeitVon: '09:00', ZeitBis: '12:00' });
      const { table: tableBE, addMock } = createTableBEMock();
      const { table: tableBZ } = createTableBZMock();

      const stillUnsyncedBz = createBZ('2023-04-12T07:00:00.000Z', '2023-04-12T23:00:00.000Z');
      getBereitschaftsZeitraumDatenMock.mockReturnValue([stillUnsyncedBz]);

      const result = await submitBereitschaftsEinsatz(modal, tableBE, tableBZ);

      expect(flushResourceMock).toHaveBeenCalledWith('BZ');
      expect(result).toBe(true);
      expect(addMock).toHaveBeenCalledTimes(1);
      const addedDaten = addMock.mock.calls[0]?.[0] as { Bereitschaftszeitraum?: string[] };
      expect(addedDaten.Bereitschaftszeitraum).toBeUndefined();
    });

    it('flusht NICHT wenn Bereitschaftszeitraum bereits vollständig synchronisiert ist (bestehendes Verhalten unverändert)', async () => {
      const bz = createBZ('2023-04-12T07:00:00.000Z', '2023-04-12T23:00:00.000Z', 'bz1');
      getBereitschaftsZeitraumDatenMock.mockReturnValue([bz]);

      const modal = createModal({ ZeitVon: '09:00', ZeitBis: '12:00' });
      const { table: tableBE, addMock } = createTableBEMock();
      const { table: tableBZ } = createTableBZMock();

      const result = await submitBereitschaftsEinsatz(modal, tableBE, tableBZ);

      expect(result).toBe(true);
      expect(flushResourceMock).not.toHaveBeenCalled();
      expect(addMock).toHaveBeenCalledWith(expect.objectContaining({ Bereitschaftszeitraum: ['bz1'] }));
    });
  });

  describe('Gap-Auflösung (berZeit)', () => {
    it('mergt zwei BZs wenn Lücke keine Grenze enthält', async () => {
      // Gap 10:00Z–12:00Z has no 08:00 or month boundary (UTC: 08:00Z already before the gap start)
      const bz1 = createBZ('2023-04-12T07:00:00.000Z', '2023-04-12T10:00:00.000Z', 'bz1');
      const bz2 = createBZ('2023-04-12T12:00:00.000Z', '2023-04-12T22:00:00.000Z', 'bz2');
      storageStore.set('dataBZ', [bz1, bz2]);

      const modal = createModal({ ZeitVon: '09:00', ZeitBis: '16:00', berZeit: true });
      const { table: tableBE } = createTableBEMock();
      const { table: tableBZ, loadMock } = createTableBZMock();

      const merged = createBZ('2023-04-12T07:00:00.000Z', '2023-04-12T22:00:00.000Z', 'bz1');
      getBereitschaftsZeitraumDatenMock.mockReturnValueOnce([bz1, bz2]).mockReturnValue([merged]);

      const result = await submitBereitschaftsEinsatz(modal, tableBE, tableBZ);

      expect(result).toBe(true);
      expect(loadMock).toHaveBeenCalledTimes(1);
      // Merged BZ should be in Storage (bz2 removed, bz1 extended to bz2.Ende)
      const storedBzs = (storageStore.get('dataBZ') as IDatenBZ[]) ?? [];
      expect(storedBzs).toHaveLength(1);
      expect(storedBzs[0]._id).toBe('bz1');
      expect(storedBzs[0].Ende).toBe('2023-04-12T22:00:00.000Z');
    });

    it('passt beide BZs bei 08:00-Grenze in der Lücke an', async () => {
      // Tests run in TZ=Europe/Berlin (CEST = UTC+2).
      // B_WECHSEL_STUNDE=8 means 08:00 Berlin = 06:00Z.
      // Gap: 05:00Z–07:00Z (= 07:00–09:00 Berlin) — contains 06:00Z (= 08:00 Berlin).
      // Explicit mock reset to avoid leakage from the merge test running before this one
      vi.clearAllMocks();
      flushResourceMock.mockResolvedValue(undefined);
      getBereitschaftsEinsatzDatenMock.mockReturnValue([]);

      const bz1 = createBZ('2023-04-12T03:00:00.000Z', '2023-04-12T05:00:00.000Z', 'bz1');
      const bz2 = createBZ('2023-04-12T07:00:00.000Z', '2023-04-12T18:00:00.000Z', 'bz2');
      storageStore.set('dataBZ', [bz1, bz2]);

      // ZeitVon='06:00' Berlin = 04:00Z → in bz1 [03:00Z–05:00Z]
      // ZeitBis='10:00' Berlin = 08:00Z → in bz2 [07:00Z–18:00Z]
      const modal = createModal({ ZeitVon: '06:00', ZeitBis: '10:00', berZeit: true });
      const { table: tableBE } = createTableBEMock();
      const { table: tableBZ, loadMock } = createTableBZMock();

      // After boundary split: bz1 ends at 06:00Z (= 08:00 Berlin), bz2 starts at 06:00Z
      const updatedBz1 = createBZ('2023-04-12T03:00:00.000Z', '2023-04-12T06:00:00.000Z', 'bz1');
      const updatedBz2 = createBZ('2023-04-12T06:00:00.000Z', '2023-04-12T18:00:00.000Z', 'bz2');
      getBereitschaftsZeitraumDatenMock.mockReturnValueOnce([bz1, bz2]).mockReturnValue([updatedBz1, updatedBz2]);

      const result = await submitBereitschaftsEinsatz(modal, tableBE, tableBZ);

      expect(result).toBe(true);
      expect(loadMock).toHaveBeenCalledTimes(1);
      expect(flushResourceMock).toHaveBeenCalledWith('BZ');
      // Storage should have both BZs adjusted to meet at 06:00Z (= 08:00 Berlin)
      const storedBzs = (storageStore.get('dataBZ') as IDatenBZ[]) ?? [];
      expect(storedBzs).toHaveLength(2);
      expect(storedBzs.find((b: IDatenBZ) => b._id === 'bz1')?.Ende).toBe('2023-04-12T06:00:00.000Z');
      expect(storedBzs.find((b: IDatenBZ) => b._id === 'bz2')?.Beginn).toBe('2023-04-12T06:00:00.000Z');
    });

    it('aktualisiert verknüpfte Bereitschaftseinsätze wenn ein gemergter BZ gelöscht wird', async () => {
      vi.clearAllMocks();
      flushResourceMock.mockResolvedValue(undefined);
      getBereitschaftsEinsatzDatenMock.mockReturnValue([]);

      const bz1 = createBZ('2023-04-12T07:00:00.000Z', '2023-04-12T10:00:00.000Z', 'bz1');
      const bz2 = createBZ('2023-04-12T12:00:00.000Z', '2023-04-12T22:00:00.000Z', 'bz2');
      storageStore.set('dataBZ', [bz1, bz2]);
      storageStore.set('dataBE', [
        { Tag: '11.04.2023', Beginn: '13:00', Ende: '14:00', LRE: 'LRE 2', Bereitschaftszeitraum: ['bz2'] },
      ]);

      const modal = createModal({ ZeitVon: '09:00', ZeitBis: '16:00', berZeit: true });
      const { table: tableBE, rowsArray } = createTableBEMock();
      rowsArray.push({
        cells: { Bereitschaftszeitraum: ['bz2'] } as unknown as IDatenBE,
        _state: 'unchanged',
      });
      const { table: tableBZ, loadMock } = createTableBZMock();

      const merged = createBZ('2023-04-12T07:00:00.000Z', '2023-04-12T22:00:00.000Z', 'bz1');
      getBereitschaftsZeitraumDatenMock.mockReturnValueOnce([bz1, bz2]).mockReturnValue([merged]);

      const result = await submitBereitschaftsEinsatz(modal, tableBE, tableBZ);

      expect(result).toBe(true);
      expect(loadMock).toHaveBeenCalledTimes(1);
      expect(scheduleAutoSaveMock).toHaveBeenCalledWith('BE');
      expect(flushResourceMock).toHaveBeenCalledWith('BE');
      const storedBes = (storageStore.get('dataBE') as { Bereitschaftszeitraum?: string[] }[]) ?? [];
      expect(storedBes[0]?.Bereitschaftszeitraum).toEqual(['bz1']);
      expect(rowsArray[0]?.cells.Bereitschaftszeitraum).toEqual(['bz1']);
      expect(rowsArray[0]?._state).toBe('modified');
    });
  });

  describe('Partial-Auflösung (berZeit)', () => {
    it('erweitert vorhandenen BZ ans Ende wenn nur der Start abgedeckt ist', async () => {
      vi.clearAllMocks();
      flushResourceMock.mockResolvedValue(undefined);
      getBereitschaftsEinsatzDatenMock.mockReturnValue([]);

      const bz1 = createBZ('2023-04-12T07:00:00.000Z', '2023-04-12T10:00:00.000Z', 'bz1');
      storageStore.set('dataBZ', [bz1]);

      // ZeitVon=11:00 (inside bz1 UTC 09Z-...wait keep in local Berlin like other tests) -> use explicit UTC-friendly values below
      const modal = createModal({ ZeitVon: '11:00', ZeitBis: '14:00', berZeit: true });
      const { table: tableBE } = createTableBEMock();
      const { table: tableBZ, loadMock } = createTableBZMock();

      const updatedBz1 = createBZ('2023-04-12T07:00:00.000Z', '2023-04-12T12:00:00.000Z', 'bz1');
      getBereitschaftsZeitraumDatenMock.mockReturnValueOnce([bz1]).mockReturnValue([updatedBz1]);

      const result = await submitBereitschaftsEinsatz(modal, tableBE, tableBZ);

      expect(result).toBe(true);
      expect(loadMock).toHaveBeenCalledTimes(1);
      expect(flushResourceMock).toHaveBeenCalledWith('BZ');
      const storedBzs = (storageStore.get('dataBZ') as IDatenBZ[]) ?? [];
      expect(storedBzs).toHaveLength(1);
      expect(storedBzs[0]._id).toBe('bz1');
      expect(storedBzs[0].Ende).not.toBe(bz1.Ende);
    });

    it('erweitert vorhandenen BZ an den Anfang wenn nur das Ende abgedeckt ist', async () => {
      vi.clearAllMocks();
      flushResourceMock.mockResolvedValue(undefined);
      getBereitschaftsEinsatzDatenMock.mockReturnValue([]);

      const bz1 = createBZ('2023-04-12T12:00:00.000Z', '2023-04-12T20:00:00.000Z', 'bz1');
      storageStore.set('dataBZ', [bz1]);

      // Berlin local -> UTC (CEST +2): ZeitVon 09:00 -> 07:00Z (outside bz1), ZeitBis 15:00 -> 13:00Z (inside bz1 12-20Z)
      const modal = createModal({ ZeitVon: '09:00', ZeitBis: '15:00', berZeit: true });
      const { table: tableBE } = createTableBEMock();
      const { table: tableBZ, loadMock } = createTableBZMock();

      const updatedBz1 = createBZ('2023-04-12T07:00:00.000Z', '2023-04-12T20:00:00.000Z', 'bz1');
      getBereitschaftsZeitraumDatenMock.mockReturnValueOnce([bz1]).mockReturnValue([updatedBz1]);

      const result = await submitBereitschaftsEinsatz(modal, tableBE, tableBZ);

      expect(result).toBe(true);
      expect(loadMock).toHaveBeenCalledTimes(1);
      const storedBzs = (storageStore.get('dataBZ') as IDatenBZ[]) ?? [];
      expect(storedBzs).toHaveLength(1);
      expect(storedBzs[0].Beginn).not.toBe(bz1.Beginn);
    });
  });

  describe('Fehlerbehandlung beim Anlegen des Zeitraums', () => {
    it('stellt vorherigen Storage-Zustand wieder her wenn flushResource fehlschlägt', async () => {
      vi.clearAllMocks();
      getBereitschaftsEinsatzDatenMock.mockReturnValue([]);
      getBereitschaftsZeitraumDatenMock.mockReturnValue([]);

      const previousBzs = [createBZ('2023-03-01T07:00:00.000Z', '2023-03-01T10:00:00.000Z', 'old')];
      const previousBes = [{ Tag: '01.03.2023', Beginn: '08:00', Ende: '09:00', LRE: 'LRE 3' }];
      storageStore.set('dataBZ', previousBzs);
      storageStore.set('dataBE', previousBes);

      calculateBereitschaftsZeitenMock.mockReturnValue([
        { Beginn: '2023-04-12T09:00:00.000Z', Ende: '2023-04-12T12:00:00.000Z', Pause: 0 },
      ]);
      flushResourceMock.mockRejectedValueOnce(new Error('Netzwerk down'));

      const modal = createModal({ ZeitVon: '09:00', ZeitBis: '12:00', berZeit: true });
      const { table: tableBE } = createTableBEMock();
      const { table: tableBZ } = createTableBZMock();

      const result = await submitBereitschaftsEinsatz(modal, tableBE, tableBZ);

      expect(result).toBe(false);
      expect(createSnackBarMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', message: expect.stringContaining('Netzwerk down') }),
      );
      expect(storageStore.get('dataBZ')).toEqual(previousBzs);
      expect(storageStore.get('dataBE')).toEqual(previousBes);
    });
  });
});
