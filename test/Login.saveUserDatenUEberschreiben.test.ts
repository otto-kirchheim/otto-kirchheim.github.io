import { beforeEach, describe, expect, it, vi } from 'bun:test';

const {
  aktualisiereBerechnungMock,
  getBereitschaftsZeitraumDatenMock,
  getBereitschaftsEinsatzDatenMock,
  getEwtDatenMock,
  getNebengeldDatenMock,
  generateEingabeMaskeEinstellungenMock,
  storageGetMock,
  storageSetMock,
  storageRemoveMock,
} = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  aktualisiereBerechnungMock: vi.fn(),
  getBereitschaftsZeitraumDatenMock: vi.fn(),
  getBereitschaftsEinsatzDatenMock: vi.fn(),
  getEwtDatenMock: vi.fn(),
  getNebengeldDatenMock: vi.fn(),
  generateEingabeMaskeEinstellungenMock: vi.fn(),
  storageGetMock: vi.fn(),
  storageSetMock: vi.fn(),
  storageRemoveMock: vi.fn(),
}));

vi.mock('../src/ts/Berechnung', () => ({
  aktualisiereBerechnung: aktualisiereBerechnungMock,
}));

vi.mock('../src/ts/Bereitschaft/utils', () => ({
  getBereitschaftsZeitraumDaten: getBereitschaftsZeitraumDatenMock,
  getBereitschaftsEinsatzDaten: getBereitschaftsEinsatzDatenMock,
}));

vi.mock('../src/ts/EWT/utils', () => ({
  getEwtDaten: getEwtDatenMock,
}));

vi.mock('../src/ts/Neben/utils', () => ({
  getNebengeldDaten: getNebengeldDatenMock,
}));

vi.mock('../src/ts/Einstellungen/utils', () => ({
  generateEingabeMaskeEinstellungen: generateEingabeMaskeEinstellungenMock,
}));

vi.mock('../src/ts/utilities/Storage', () => ({
  default: {
    get: storageGetMock,
    set: storageSetMock,
    remove: storageRemoveMock,
  },
}));

import overwriteUserDaten from '../src/ts/Login/utils/overwriteUserDaten';

function createTable(id: string, loadSpy: ReturnType<typeof vi.fn>): void {
  const table = document.createElement('table') as HTMLTableElement & {
    instance: { rows: { load: ReturnType<typeof vi.fn>; setFilter: ReturnType<typeof vi.fn> } };
  };
  table.id = id;
  table.instance = { rows: { load: loadSpy, setFilter: vi.fn() } };
  document.body.appendChild(table);
}

describe('overwriteUserDaten', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('ueberschreibt alle vorhandenen Datenbereiche und aktualisiert Tabellen', () => {
    const loadVE = vi.fn();
    const loadBZ = vi.fn();
    const loadBE = vi.fn();
    const loadE = vi.fn();
    const loadN = vi.fn();
    createTable('tableVE', loadVE);
    createTable('tableBZ', loadBZ);
    createTable('tableBE', loadBE);
    createTable('tableE', loadE);
    createTable('tableN', loadN);

    const vorgabenU = {
      pers: { Vorname: 'Otto' },
      vorgabenB: { A: { Name: 'A' } },
      Einstellungen: { aktivierteTabs: [] },
    };
    const dataServer = {
      vorgabenU,
      BZ: { 3: [{ tag: 'bz' }] },
      BE: { 3: [{ tag: 'be' }] },
      EWT: { 3: [{ tag: 'ewt' }] },
      N: { 3: [{ tag: 'n' }] },
    };
    const expectedBZ = dataServer.BZ;
    const expectedBE = dataServer.BE;
    const expectedEWT = dataServer.EWT;
    const expectedN = dataServer.N;

    storageGetMock.mockImplementation((key: string) => {
      if (key === 'dataServer') return dataServer;
      if (key === 'Monat') return 3;
      return undefined;
    });

    getBereitschaftsZeitraumDatenMock.mockReturnValue([{ mapped: 'bz' }]);
    getBereitschaftsEinsatzDatenMock.mockReturnValue([{ mapped: 'be' }]);
    getEwtDatenMock.mockReturnValue([{ mapped: 'ewt' }]);
    getNebengeldDatenMock.mockReturnValue([{ mapped: 'n' }]);

    overwriteUserDaten();

    expect(storageSetMock).toHaveBeenCalledWith('VorgabenU', vorgabenU);
    expect(storageSetMock).toHaveBeenCalledWith('dataBZ', expectedBZ);
    expect(storageSetMock).toHaveBeenCalledWith('dataBE', expectedBE);
    expect(storageSetMock).toHaveBeenCalledWith('dataE', expectedEWT);
    expect(storageSetMock).toHaveBeenCalledWith('dataN', expectedN);

    expect(loadVE).toHaveBeenCalledWith([{ Name: 'A' }]);
    expect(loadBZ).toHaveBeenCalledWith([{ mapped: 'bz' }]);
    expect(loadBE).toHaveBeenCalledWith([{ mapped: 'be' }]);
    expect(loadE).toHaveBeenCalledWith([{ mapped: 'ewt' }]);
    expect(loadN).toHaveBeenCalledWith([{ mapped: 'n' }]);

    expect(getBereitschaftsZeitraumDatenMock).toHaveBeenCalledWith(expectedBZ, undefined, { scope: 'all' });
    expect(getBereitschaftsEinsatzDatenMock).toHaveBeenCalledWith(expectedBE, undefined, { scope: 'all' });
    expect(getEwtDatenMock).toHaveBeenCalledWith(expectedEWT, undefined, { scope: 'all' });
    expect(getNebengeldDatenMock).toHaveBeenCalledWith(expectedN, undefined, { scope: 'all' });

    expect(generateEingabeMaskeEinstellungenMock).toHaveBeenCalledWith(vorgabenU);
    expect(aktualisiereBerechnungMock).toHaveBeenCalledTimes(1);
    expect(storageRemoveMock).toHaveBeenCalledWith('dataServer');
  });

  it('funktioniert mit leerem dataServer und entfernt trotzdem dataServer', () => {
    storageGetMock.mockImplementation((key: string) => {
      if (key === 'dataServer') return {};
      if (key === 'Monat') return 3;
      return undefined;
    });

    overwriteUserDaten();

    expect(storageSetMock).not.toHaveBeenCalled();
    expect(aktualisiereBerechnungMock).toHaveBeenCalledTimes(1);
    expect(storageRemoveMock).toHaveBeenCalledWith('dataServer');
  });
});
