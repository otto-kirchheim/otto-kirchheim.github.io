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

vi.mock('../src/ts/core/orchestration/auth/utils', () => ({
  overwriteUserDaten: overwriteUserDatenMock,
}));

vi.mock('../src/ts/features/Berechnung', () => ({
  aktualisiereBerechnung: aktualisiereBerechnungMock,
}));

vi.mock('../src/ts/features/Berechnung/generateTableBerechnung', () => ({
  default: generateTableBerechnungMock,
}));

vi.mock('../src/ts/features/Einstellungen/utils', () => ({
  generateEingabeMaskeEinstellungen: generateEingabeMaskeEinstellungenMock,
}));

vi.mock('../src/ts/class/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

vi.mock('../src/ts/infrastructure/storage/Storage', () => ({
  default: {
    check: storageCheckMock,
    get: storageGetMock,
    set: storageSetMock,
    remove: storageRemoveMock,
    getTimestamp: storageGetTimestampMock,
    setWithTimestamp: storageSetWithTimestampMock,
  },
}));

vi.mock('../src/ts/infrastructure/ui/buttonDisable', () => ({
  default: buttonDisableMock,
}));

vi.mock('../src/ts/infrastructure/ui/clearLoading', () => ({
  default: clearLoadingMock,
}));

vi.mock('../src/ts/infrastructure/ui/updateTabVisibility', () => ({
  default: updateTabVisibilityMock,
}));

vi.mock('../src/ts/infrastructure/api/apiService', () => ({
  loadAllYearData: loadAllYearDataMock,
}));

import loadUserDaten from '../src/ts/core/orchestration/auth/utils/loadUserDaten';

type MockTableInstance = {
  rows: {
    load: ReturnType<typeof vi.fn>;
    setFilter: ReturnType<typeof vi.fn>;
    array: Array<{ _id?: string; _state: string; cells: unknown; CustomTable: unknown; columns: unknown }>;
    getChanges: ReturnType<typeof vi.fn>;
  };
  drawRows: ReturnType<typeof vi.fn>;
  columns: { array: [] };
};

function createTable(id: string, loadSpy: ReturnType<typeof vi.fn>): MockTableInstance {
  const instance: MockTableInstance = {
    rows: {
      load: loadSpy,
      setFilter: vi.fn(),
      array: [],
      getChanges: vi.fn().mockReturnValue({ create: [], update: [], delete: [] }),
    },
    drawRows: vi.fn(),
    columns: { array: [] },
  };
  const table = document.createElement('table') as HTMLTableElement & { instance: MockTableInstance };
  table.id = id;
  table.instance = instance;
  document.body.appendChild(table);
  return instance;
}

describe('loadUserDaten', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <h1 id="Willkommen"></h1>
      <div id="navmenu" class="d-none"></div>
      <button id="btn-navmenu" class="d-none"></button>
      <div id="conflictReviewBannerMount"></div>
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

  it('unterdrückt die generische Server-Snackbar bei ungültiger Session', async () => {
    loadAllYearDataMock.mockImplementation(async () => {
      throw new Error('Session ungültig oder abgemeldet');
    });

    await loadUserDaten(3, 2026);

    expect(createSnackBarMock).not.toHaveBeenCalled();
    expect(clearLoadingMock).toHaveBeenCalledWith('btnAuswaehlen');
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

  it('nutzt Serverdaten wenn lokale Ressourcen zwar neuer wirken, aber keine _id enthalten', async () => {
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

    const loaded = {
      vorgabenU: {
        pers: { Vorname: 'ServerOtto' },
        vorgabenB: { A: { Name: 'Server' } },
        Einstellungen: { aktivierteTabs: ['Bereitschaft', 'EWT'] },
      },
      datenGeld: { a: 3 },
      BZ: { 3: [{ _id: 'bz-server', bz: 'server' }] },
      BE: { 3: [{ _id: 'be-server', be: 'server' }] },
      EWT: { 3: [{ _id: 'ewt-server', ewt: 'server' }] },
      N: { 3: [{ _id: 'n-server', n: 'server' }] },
      timestamps: {
        VorgabenU: '2026-03-01T00:00:00.000Z',
        dataBZ: '2026-03-01T00:00:00.000Z',
        dataBE: '2026-03-01T00:00:00.000Z',
        dataE: '2026-03-01T00:00:00.000Z',
        dataN: '2026-03-01T00:00:00.000Z',
      },
    };

    loadAllYearDataMock.mockResolvedValue(loaded);
    storageCheckMock.mockImplementation((key: string) =>
      ['VorgabenU', 'dataBZ', 'dataBE', 'dataE', 'dataN'].includes(key),
    );
    storageGetMock.mockImplementation((key: string) => {
      if (key === 'VorgabenU') return loaded.vorgabenU;
      if (key === 'dataBZ') return [{ bz: 'server' }];
      if (key === 'dataBE') return [{ be: 'server' }];
      if (key === 'dataE') return [{ ewt: 'server' }];
      if (key === 'dataN') return [{ n: 'server' }];
      return undefined;
    });
    storageGetTimestampMock.mockReturnValue(Date.parse('2026-04-01T00:00:00.000Z'));

    aktualisiereBerechnungMock.mockReturnValue({ calc: true });

    await loadUserDaten(3, 2026);

    expect(storageSetWithTimestampMock).toHaveBeenCalledWith(
      'dataBZ',
      loaded.BZ,
      Date.parse('2026-03-01T00:00:00.000Z'),
    );
    expect(storageSetWithTimestampMock).toHaveBeenCalledWith(
      'dataBE',
      loaded.BE,
      Date.parse('2026-03-01T00:00:00.000Z'),
    );
    expect(storageSetWithTimestampMock).toHaveBeenCalledWith(
      'dataE',
      loaded.EWT,
      Date.parse('2026-03-01T00:00:00.000Z'),
    );
    expect(storageSetWithTimestampMock).toHaveBeenCalledWith('dataN', loaded.N, Date.parse('2026-03-01T00:00:00.000Z'));

    expect(loadBZ).toHaveBeenCalledWith([{ _id: 'bz-server', bz: 'server' }]);
    expect(loadBE).toHaveBeenCalledWith([{ _id: 'be-server', be: 'server' }]);
    expect(loadE).toHaveBeenCalledWith([{ _id: 'ewt-server', ewt: 'server' }]);
    expect(loadN).toHaveBeenCalledWith([{ _id: 'n-server', n: 'server' }]);
  });

  it('fragt bei abweichender Array-Laenge nach und zeigt Unterschiede pro Monat', async () => {
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

    const loaded = {
      vorgabenU: {
        pers: { Vorname: 'ServerOtto' },
        vorgabenB: { A: { Name: 'Server' } },
        Einstellungen: { aktivierteTabs: ['Bereitschaft', 'EWT'] },
      },
      datenGeld: { a: 4 },
      BZ: [
        { beginB: '2026-03-01T08:00:00.000Z', bz: 'server-1' },
        { beginB: '2026-04-01T08:00:00.000Z', bz: 'server-2' },
      ],
      BE: { 3: [{ be: 'server' }] },
      EWT: { 3: [{ ewt: 'server' }] },
      N: { 3: [{ n: 'server' }] },
      timestamps: {
        VorgabenU: '2026-03-01T00:00:00.000Z',
        dataBZ: '2026-03-01T00:00:00.000Z',
        dataBE: '2026-03-01T00:00:00.000Z',
        dataE: '2026-03-01T00:00:00.000Z',
        dataN: '2026-03-01T00:00:00.000Z',
      },
    };

    loadAllYearDataMock.mockResolvedValue(loaded);
    storageCheckMock.mockImplementation((key: string) =>
      ['VorgabenU', 'dataBZ', 'dataBE', 'dataE', 'dataN'].includes(key),
    );
    storageGetMock.mockImplementation((key: string) => {
      if (key === 'VorgabenU') return loaded.vorgabenU;
      if (key === 'dataBZ') return [{ beginB: '2026-03-01T08:00:00.000Z', bz: 'server-1' }];
      if (key === 'dataBE') return loaded.BE;
      if (key === 'dataE') return loaded.EWT;
      if (key === 'dataN') return loaded.N;
      return undefined;
    });
    storageGetTimestampMock.mockReturnValue(Date.parse('2026-04-01T00:00:00.000Z'));

    aktualisiereBerechnungMock.mockReturnValue({ calc: true });

    await loadUserDaten(3, 2026);

    expect(storageSetWithTimestampMock).not.toHaveBeenCalledWith(
      'dataBZ',
      loaded.BZ,
      Date.parse('2026-03-01T00:00:00.000Z'),
    );
    expect(storageSetMock).toHaveBeenCalledWith(
      'dataServer',
      expect.objectContaining({
        BZ: loaded.BZ,
      }),
    );
    // Bei Längenmismatch sollte die Tabelle mit lokalen Daten geladen werden
    expect(loadBZ).toHaveBeenCalledWith([{ beginB: '2026-03-01T08:00:00.000Z', bz: 'server-1' }]);

    const infoCall = createSnackBarMock.mock.calls.find(([config]) => config?.status === 'info');
    expect(infoCall).toBeDefined();
    expect(infoCall?.[0]?.message).toContain('Bereitschaftszeit');
    expect(infoCall?.[0]?.message).toContain('Apr');
  });

  it('zeigt EWT-Unterschiede ueber alle Monate (Buchungstag) an', async () => {
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

    const loaded = {
      vorgabenU: {
        pers: { Vorname: 'ServerOtto' },
        vorgabenB: { A: { Name: 'Server' } },
        Einstellungen: { aktivierteTabs: ['Bereitschaft', 'EWT'] },
      },
      datenGeld: { a: 5 },
      BZ: [{ beginB: '2026-03-01T08:00:00.000Z', bz: 'server-1' }],
      BE: [{ tagBE: '01.03.2026', be: 'server' }],
      EWT: [
        { tagE: '2026-03-31', buchungstagE: '2026-04-01', ewt: 'server-1' },
        { tagE: '2026-05-02', buchungstagE: '2026-05-02', ewt: 'server-2' },
      ],
      N: [{ tagN: '01.03.2026', n: 'server' }],
      timestamps: {
        VorgabenU: '2026-03-01T00:00:00.000Z',
        dataBZ: '2026-03-01T00:00:00.000Z',
        dataBE: '2026-03-01T00:00:00.000Z',
        dataE: '2026-03-01T00:00:00.000Z',
        dataN: '2026-03-01T00:00:00.000Z',
      },
    };

    loadAllYearDataMock.mockResolvedValue(loaded);
    storageCheckMock.mockImplementation((key: string) =>
      ['VorgabenU', 'dataBZ', 'dataBE', 'dataE', 'dataN'].includes(key),
    );
    storageGetMock.mockImplementation((key: string) => {
      if (key === 'VorgabenU') return loaded.vorgabenU;
      if (key === 'dataBZ') return loaded.BZ;
      if (key === 'dataBE') return loaded.BE;
      if (key === 'dataE') return [{ tagE: '2026-03-31', buchungstagE: '2026-04-01', ewt: 'local-1' }];
      if (key === 'dataN') return loaded.N;
      return undefined;
    });
    storageGetTimestampMock.mockReturnValue(Date.parse('2026-04-01T00:00:00.000Z'));

    aktualisiereBerechnungMock.mockReturnValue({ calc: true });

    await loadUserDaten(3, 2026);

    const infoCall = createSnackBarMock.mock.calls.find(([config]) => config?.status === 'info');
    expect(infoCall).toBeDefined();
    expect(infoCall?.[0]?.message).toContain('EWT');
    expect(infoCall?.[0]?.message).toContain('Mai');
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

  it('zeigt Review-Banner und deaktiviert AutoSave bei "Lokale Daten behalten"', async () => {
    const loadBZ = vi.fn();
    const loadBE = vi.fn();
    const loadE = vi.fn();
    const loadN = vi.fn();
    const loadVE = vi.fn();
    const bzInstance = createTable('tableBZ', loadBZ);
    createTable('tableBE', loadBE);
    createTable('tableE', loadE);
    createTable('tableN', loadN);
    createTable('tableVE', loadVE);

    // Lokal: 3 BZ-Zeilen für März, Server: 2 BZ-Zeilen
    // -> eine lokale fehlt auf dem Server, eine serverseitig extra
    const localBZ = [
      { _id: 'bz-local-1', beginB: '2026-03-01T08:00:00.000Z', bz: 'local-1' },
      { _id: 'bz-local-extra', beginB: '2026-03-22T08:00:00.000Z', bz: 'local-extra' },
      { _id: 'bz-local-extra-2', beginB: '2026-03-25T08:00:00.000Z', bz: 'local-extra-2' },
    ];
    const serverBZ = [
      { _id: 'bz-local-1', beginB: '2026-03-01T08:00:00.000Z', bz: 'local-1' },
      { _id: 'bz-server-extra', beginB: '2026-03-15T08:00:00.000Z', bz: 'server-extra' },
    ];

    const loaded = {
      vorgabenU: {
        pers: { Vorname: 'Otto' },
        vorgabenB: { A: { Name: 'A' } },
        Einstellungen: { aktivierteTabs: ['Bereitschaft'] },
      },
      datenGeld: { a: 1 },
      BZ: serverBZ,
      BE: { 3: [] },
      EWT: { 3: [] },
      N: { 3: [] },
      timestamps: {
        VorgabenU: '2026-01-01T00:00:00.000Z',
        dataBZ: '2026-01-01T00:00:00.000Z',
        dataBE: '2026-01-01T00:00:00.000Z',
        dataE: '2026-01-01T00:00:00.000Z',
        dataN: '2026-01-01T00:00:00.000Z',
      },
    };

    loadAllYearDataMock.mockResolvedValue(loaded);
    storageCheckMock.mockImplementation((key: string) =>
      ['dataBZ', 'VorgabenU', 'dataBE', 'dataE', 'dataN'].includes(key),
    );
    storageGetMock.mockImplementation((key: string) => {
      if (key === 'dataBZ') return localBZ;
      if (key === 'VorgabenU') return loaded.vorgabenU;
      if (key === 'dataBE') return [];
      if (key === 'dataE') return [];
      if (key === 'dataN') return [];
      return undefined;
    });
    storageGetTimestampMock.mockReturnValue(Date.parse('2026-04-01T00:00:00.000Z'));
    aktualisiereBerechnungMock.mockReturnValue({});

    await loadUserDaten(3, 2026);

    // Mismatch-Snackbar wurde gezeigt
    const infoCall = createSnackBarMock.mock.calls.find(([c]) => c?.status === 'info');
    expect(infoCall).toBeDefined();

    // "Vergleichen & manuell speichern" Action auslösen
    const actions = infoCall?.[0]?.actions as Array<{ text: string; function: () => void }>;
    const compareAction = actions?.find(a => a.text.includes('Vergleichen & manuell speichern'));
    expect(compareAction).toBeDefined();

    // Mock-Tabellenzustand wie nach rows.load(localBZ)
    bzInstance.rows.array = localBZ.map(row => ({
      _id: row._id,
      _state: 'unchanged',
      cells: row,
      CustomTable: bzInstance,
      columns: bzInstance.columns,
    }));

    compareAction!.function();

    // Review-Banner wird angezeigt
    const bannerMount = document.getElementById('conflictReviewBannerMount');
    expect(bannerMount?.hasChildNodes()).toBe(true);

    // Banner-Text enthält die betroffene Ressource
    expect(bannerMount?.textContent).toContain('Bereitschaftszeit');

    // bzInstance.rows.array enthält das serverseitige Extra als deleted
    const deletedRow = bzInstance.rows.array.find(r => r._id === 'bz-server-extra');
    expect(deletedRow).toBeDefined();
    expect(deletedRow?._state).toBe('deleted');

    // Lokales Extra ohne Server-Gegenstück wird ebenfalls als deleted markiert
    const deletedLocalOnlyRow = bzInstance.rows.array.find(r => r._id === 'bz-local-extra');
    expect(deletedLocalOnlyRow).toBeDefined();
    expect(deletedLocalOnlyRow?._state).toBe('deleted');

    // clearLoading wurde beim Snackbar-Dismiss aufgerufen und UI waehrend Review gesperrt
    expect(clearLoadingMock).toHaveBeenCalledWith('btnAuswaehlen');
    expect(buttonDisableMock).toHaveBeenCalledWith(true);

    // "Jetzt speichern" klicken → Banner wird ausgeblendet
    const saveBtn = bannerMount?.querySelector('button') as HTMLButtonElement;
    saveBtn.click();
    await new Promise(resolve => setTimeout(resolve, 10)); // async flush

    expect(bannerMount?.hasChildNodes()).toBe(false);
    expect(buttonDisableMock).toHaveBeenCalledWith(false);
  });
});
