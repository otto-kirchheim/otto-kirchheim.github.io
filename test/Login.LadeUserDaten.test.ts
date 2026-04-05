import { beforeEach, describe, expect, it, vi } from 'bun:test';

const viCompat = vi as typeof vi & {
  hoisted: <T>(factory: () => T) => T;
};

const {
  overwriteUserDatenMock,
  aktualisiereBerechnungMock,
  generateTableBerechnungMock,
  generateEingabeMaskeEinstellungenMock,
  createSnackBarMock,
  storageCheckMock,
  storageGetMock,
  storageSetMock,
  storageRemoveMock,
  storageGetTimestampMock,
  storageSetWithTimestampMock,
  buttonDisableMock,
  clearLoadingMock,
  updateTabVisibilityMock,
  loadAllYearDataMock,
} = viCompat.hoisted(() => ({
  overwriteUserDatenMock: vi.fn(),
  aktualisiereBerechnungMock: vi.fn(),
  generateTableBerechnungMock: vi.fn(),
  generateEingabeMaskeEinstellungenMock: vi.fn(),
  createSnackBarMock: vi.fn(),
  storageCheckMock: vi.fn(),
  storageGetMock: vi.fn(),
  storageSetMock: vi.fn(),
  storageRemoveMock: vi.fn(),
  storageGetTimestampMock: vi.fn(),
  storageSetWithTimestampMock: vi.fn(),
  buttonDisableMock: vi.fn(),
  clearLoadingMock: vi.fn(),
  updateTabVisibilityMock: vi.fn(),
  loadAllYearDataMock: vi.fn(),
}));

vi.mock('../src/ts/Login/utils', () => ({
  overwriteUserDaten: overwriteUserDatenMock,
}));

vi.mock('../src/ts/Berechnung', () => ({
  aktualisiereBerechnung: aktualisiereBerechnungMock,
}));

vi.mock('../src/ts/Berechnung/generateTableBerechnung', () => ({
  default: generateTableBerechnungMock,
}));

vi.mock('../src/ts/Einstellungen/utils', () => ({
  generateEingabeMaskeEinstellungen: generateEingabeMaskeEinstellungenMock,
}));

vi.mock('../src/ts/class/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

vi.mock('../src/ts/utilities/Storage', () => ({
  default: {
    check: storageCheckMock,
    get: storageGetMock,
    set: storageSetMock,
    remove: storageRemoveMock,
    getTimestamp: storageGetTimestampMock,
    setWithTimestamp: storageSetWithTimestampMock,
  },
}));

vi.mock('../src/ts/utilities/buttonDisable', () => ({
  default: buttonDisableMock,
}));

vi.mock('../src/ts/utilities/clearLoading', () => ({
  default: clearLoadingMock,
}));

vi.mock('../src/ts/utilities/updateTabVisibility', () => ({
  default: updateTabVisibilityMock,
}));

vi.mock('../src/ts/utilities/apiService', () => ({
  loadAllYearData: loadAllYearDataMock,
}));

import loadUserDaten from '../src/ts/Login/utils/loadUserDaten';

function createTable(id: string, loadSpy: ReturnType<typeof vi.fn>): void {
  const table = document.createElement('table') as HTMLTableElement & {
    instance: { rows: { load: ReturnType<typeof vi.fn>; setFilter: ReturnType<typeof vi.fn> } };
  };
  table.id = id;
  table.instance = { rows: { load: loadSpy, setFilter: vi.fn() } };
  document.body.appendChild(table);
}

describe('loadUserDaten', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <h1 id="Willkommen"></h1>
      <div id="navmenu" class="d-none"></div>
      <button id="btn-navmenu" class="d-none"></button>
    `;
    vi.clearAllMocks();
  });

  it('zeigt Fehler-Snackbar wenn loadAllYearData fehlschlaegt', async () => {
    loadAllYearDataMock.mockImplementation(async () => {
      throw new Error('offline');
    });

    await loadUserDaten(3, 2026);

    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
    expect(clearLoadingMock).toHaveBeenCalledWith('btnAuswaehlen');
    expect(storageSetMock).not.toHaveBeenCalled();
  });

  it('laedt Daten, setzt Storage und aktualisiert UI im Erfolgsfall ohne Konflikte', async () => {
    const loadBZ = vi.fn();
    const loadBE = vi.fn();
    const loadE = vi.fn();
    const loadN = vi.fn();
    const loadVE = vi.fn();
    createTable('tableBZ', loadBZ);
    createTable('tableBE', loadBE);
    createTable('tableE', loadE);
    createTable('tableN', loadN);
    createTable('tableVE', loadVE);

    const vorgabenU = {
      pers: { Vorname: 'Otto' },
      vorgabenB: { A: { Name: 'A' } },
      Einstellungen: { aktivierteTabs: ['Bereitschaft'] },
    };

    const loaded = {
      vorgabenU,
      datenGeld: { a: 1 },
      BZ: { 3: [{ bz: 1 }] },
      BE: { 3: [{ be: 1 }] },
      EWT: { 3: [{ ewt: 1 }] },
      N: { 3: [{ n: 1 }] },
      timestamps: {
        VorgabenU: '2026-01-01T00:00:00.000Z',
        dataBZ: '2026-01-01T00:00:00.000Z',
        dataBE: '2026-01-01T00:00:00.000Z',
        dataE: '2026-01-01T00:00:00.000Z',
        dataN: '2026-01-01T00:00:00.000Z',
      },
    };

    loadAllYearDataMock.mockResolvedValue(loaded);
    storageCheckMock.mockReturnValue(false);
    storageGetMock.mockReturnValue(undefined);
    storageGetTimestampMock.mockReturnValue(0);

    aktualisiereBerechnungMock.mockReturnValue({ calc: true });

    await loadUserDaten(3, 2026);

    expect(storageSetWithTimestampMock).toHaveBeenCalledWith(
      'VorgabenU',
      vorgabenU,
      Date.parse('2026-01-01T00:00:00.000Z'),
    );
    expect(storageSetMock).toHaveBeenCalledWith('VorgabenGeld', loaded.datenGeld);
    expect(updateTabVisibilityMock).toHaveBeenCalledWith(['Bereitschaft']);

    expect(generateTableBerechnungMock).toHaveBeenCalledWith({ calc: true }, loaded.datenGeld);
    expect(generateEingabeMaskeEinstellungenMock).toHaveBeenCalledWith(vorgabenU);

    expect(loadBZ).toHaveBeenCalledWith([{ bz: 1 }]);
    expect(loadBE).toHaveBeenCalledWith([{ be: 1 }]);
    expect(loadE).toHaveBeenCalledWith([{ ewt: 1 }]);
    expect(loadN).toHaveBeenCalledWith([{ n: 1 }]);
    expect(loadVE).toHaveBeenCalledWith([{ Name: 'A' }]);

    expect(buttonDisableMock).toHaveBeenCalledWith(false);
    expect(clearLoadingMock).toHaveBeenCalledWith('btnAuswaehlen');
    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    expect(document.querySelector('#navmenu')?.classList.contains('d-none')).toBe(false);
    expect(document.querySelector('#btn-navmenu')?.classList.contains('d-none')).toBe(false);
  });

  it('erkennt Konflikte bei neueren Serverdaten und verarbeitet beide Snackbar-Actions', async () => {
    const loadBZ = vi.fn();
    const loadBE = vi.fn();
    const loadE = vi.fn();
    const loadN = vi.fn();
    const loadVE = vi.fn();
    createTable('tableBZ', loadBZ);
    createTable('tableBE', loadBE);
    createTable('tableE', loadE);
    createTable('tableN', loadN);
    createTable('tableVE', loadVE);

    const serverVorgabenU = {
      pers: { Vorname: 'ServerOtto' },
      vorgabenB: { A: { Name: 'Server' } },
      Einstellungen: { aktivierteTabs: ['Bereitschaft', 'EWT'] },
    };
    const localVorgabenU = {
      pers: { Vorname: 'LocalOtto' },
      vorgabenB: { A: { Name: 'Local' } },
      Einstellungen: { aktivierteTabs: ['Bereitschaft'] },
    };

    const localBZ = { 3: [{ bz: 'local' }] };
    const localBE = { 3: [{ be: 'local' }] };
    const localEWT = { 3: [{ ewt: 'local' }] };
    const localN = { 3: [{ n: 'local' }] };

    const loaded = {
      vorgabenU: serverVorgabenU,
      datenGeld: { a: 2 },
      BZ: { 3: [{ bz: 'server' }] },
      BE: { 3: [{ be: 'server' }] },
      EWT: { 3: [{ ewt: 'server' }] },
      N: { 3: [{ n: 'server' }] },
      timestamps: {
        VorgabenU: '2026-02-01T00:00:00.000Z',
        dataBZ: '2026-02-01T00:00:00.000Z',
        dataBE: '2026-02-01T00:00:00.000Z',
        dataE: '2026-02-01T00:00:00.000Z',
        dataN: '2026-02-01T00:00:00.000Z',
      },
    };

    loadAllYearDataMock.mockResolvedValue(loaded);
    storageCheckMock.mockImplementation((key: string) =>
      ['dataServer', 'VorgabenU', 'dataBZ', 'dataBE', 'dataE', 'dataN'].includes(key),
    );
    storageGetMock.mockImplementation((key: string) => {
      if (key === 'dataServer') return {};
      if (key === 'VorgabenU') return localVorgabenU;
      if (key === 'dataBZ') return localBZ;
      if (key === 'dataBE') return localBE;
      if (key === 'dataE') return localEWT;
      if (key === 'dataN') return localN;
      return undefined;
    });
    // Lokaler Timestamp älter als Server → Server überschreibt
    storageGetTimestampMock.mockReturnValue(Date.parse('2026-01-01T00:00:00.000Z'));

    aktualisiereBerechnungMock.mockReturnValue({ calc: true });

    await loadUserDaten(3, 2026);

    // Server ist neuer → alle Ressourcen werden via setWithTimestamp gespeichert
    const feb = Date.parse('2026-02-01T00:00:00.000Z');
    expect(storageSetWithTimestampMock).toHaveBeenCalledWith('VorgabenU', serverVorgabenU, feb);
    expect(storageSetWithTimestampMock).toHaveBeenCalledWith('dataBZ', loaded.BZ, feb);
    expect(storageSetWithTimestampMock).toHaveBeenCalledWith('dataBE', loaded.BE, feb);
    expect(storageSetWithTimestampMock).toHaveBeenCalledWith('dataE', loaded.EWT, feb);
    expect(storageSetWithTimestampMock).toHaveBeenCalledWith('dataN', loaded.N, feb);

    expect(storageSetMock).toHaveBeenCalledWith('VorgabenGeld', loaded.datenGeld);

    // Tabellen werden geladen (Server überschreibt)
    expect(loadVE).toHaveBeenCalledWith([{ Name: 'Server' }]);
    expect(loadBZ).toHaveBeenCalledWith([{ bz: 'server' }]);
    expect(loadBE).toHaveBeenCalledWith([{ be: 'server' }]);
    expect(loadE).toHaveBeenCalledWith([{ ewt: 'server' }]);
    expect(loadN).toHaveBeenCalledWith([{ n: 'server' }]);

    expect(buttonDisableMock).toHaveBeenCalledWith(false);
    expect(clearLoadingMock).toHaveBeenCalledWith('btnAuswaehlen');
    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
  });
});
