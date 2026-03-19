import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  aktualisiereBerechnungMock,
  dataBZMock,
  dataBEMock,
  dataEMock,
  dataNMock,
  generateEingabeMaskeEinstellungenMock,
  storageGetMock,
  storageSetMock,
  storageRemoveMock,
} = vi.hoisted(() => ({
  aktualisiereBerechnungMock: vi.fn(),
  dataBZMock: vi.fn(),
  dataBEMock: vi.fn(),
  dataEMock: vi.fn(),
  dataNMock: vi.fn(),
  generateEingabeMaskeEinstellungenMock: vi.fn(),
  storageGetMock: vi.fn(),
  storageSetMock: vi.fn(),
  storageRemoveMock: vi.fn(),
}));

vi.mock('../src/ts/Berechnung', () => ({
  aktualisiereBerechnung: aktualisiereBerechnungMock,
}));

vi.mock('../src/ts/Bereitschaft/utils', () => ({
  DataBZ: dataBZMock,
  DataBE: dataBEMock,
}));

vi.mock('../src/ts/EWT/utils', () => ({
  DataE: dataEMock,
}));

vi.mock('../src/ts/Neben/utils', () => ({
  DataN: dataNMock,
}));

vi.mock('../src/ts/Einstellungen/utils', () => ({
  generateEingabeMaskeEinstellungen: generateEingabeMaskeEinstellungenMock,
}));

vi.mock('../src/ts/utilities', () => ({
  Storage: {
    get: storageGetMock,
    set: storageSetMock,
    remove: storageRemoveMock,
  },
}));

import SaveUserDatenUEberschreiben from '../src/ts/Login/utils/SaveUserDatenUEberschreiben';

function createTable(id: string, loadSpy: ReturnType<typeof vi.fn>): void {
  const table = document.createElement('table') as HTMLTableElement & {
    instance: { rows: { load: ReturnType<typeof vi.fn> } };
  };
  table.id = id;
  table.instance = { rows: { load: loadSpy } };
  document.body.appendChild(table);
}

describe('SaveUserDatenUEberschreiben', () => {
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

    dataBZMock.mockReturnValue([{ mapped: 'bz' }]);
    dataBEMock.mockReturnValue([{ mapped: 'be' }]);
    dataEMock.mockReturnValue([{ mapped: 'ewt' }]);
    dataNMock.mockReturnValue([{ mapped: 'n' }]);

    SaveUserDatenUEberschreiben();

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

    SaveUserDatenUEberschreiben();

    expect(storageSetMock).not.toHaveBeenCalled();
    expect(aktualisiereBerechnungMock).toHaveBeenCalledTimes(1);
    expect(storageRemoveMock).toHaveBeenCalledWith('dataServer');
  });
});
