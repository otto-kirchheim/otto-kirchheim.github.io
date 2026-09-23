import { beforeEach, describe, expect, it, vi } from 'bun:test';

const {
  publishDataChangedMock,
  getBereitschaftsZeitraumDatenMock,
  getBereitschaftsEinsatzDatenMock,
  getEwtDatenMock,
  getNebengeldDatenMock,
  generateEingabeMaskeEinstellungenMock,
  storageGetMock,
  storageSetMock,
  storageRemoveMock,
  scheduleAutoSaveMock,
} = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  publishDataChangedMock: vi.fn(),
  getBereitschaftsZeitraumDatenMock: vi.fn(),
  getBereitschaftsEinsatzDatenMock: vi.fn(),
  getEwtDatenMock: vi.fn(),
  getNebengeldDatenMock: vi.fn(),
  generateEingabeMaskeEinstellungenMock: vi.fn(),
  storageGetMock: vi.fn(),
  storageSetMock: vi.fn(),
  storageRemoveMock: vi.fn(),
  scheduleAutoSaveMock: vi.fn(),
}));

vi.mock('@/core', () => ({
  publishEvent: publishDataChangedMock,
}));

vi.mock('@/features/ber/model', () => ({
  getBereitschaftsZeitraumDaten: getBereitschaftsZeitraumDatenMock,
  getBereitschaftsEinsatzDaten: getBereitschaftsEinsatzDatenMock,
}));

vi.mock('@/features/ewt/model', () => ({
  getEwtDaten: getEwtDatenMock,
}));

vi.mock('@/features/ez/model', () => ({
  getNebengeldDaten: getNebengeldDatenMock,
}));

vi.mock('@/features/Einstellungen/utils', () => ({
  generateEingabeMaskeEinstellungen: generateEingabeMaskeEinstellungenMock,
}));

vi.mock('@/shared/lib/storage/Storage', () => ({
  default: {
    get: storageGetMock,
    set: storageSetMock,
    remove: storageRemoveMock,
  },
}));

vi.mock('@/shared/lib/autosave/autoSave', () => ({
  scheduleAutoSave: scheduleAutoSaveMock,
}));

import '@/app/features';
import { featureRegistry } from '@/shared/lib/feature';
import overwriteUserDaten from '@/app/session/overwriteUserDaten';

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

  it('ueberschreibt alle vorhandenen Datenbereiche und aktualisiert Tabellen', async () => {
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
      Pers: { Vorname: 'Otto' },
      VorgabenB: { A: { Name: 'A' } },
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

    await overwriteUserDaten();

    expect(storageSetMock).toHaveBeenCalledWith('VorgabenU', vorgabenU);
    expect(storageSetMock).toHaveBeenCalledWith('dataBZ', expectedBZ);
    expect(storageSetMock).toHaveBeenCalledWith('dataBE', expectedBE);
    expect(storageSetMock).toHaveBeenCalledWith('dataE', expectedEWT);
    expect(storageSetMock).toHaveBeenCalledWith('dataN', expectedN);

    // Die Bereitschafts-Vorgaben (`#tableVE`) laedt der Einstellungen-Slot der Bereitschaft (`read`), siehe Bereitschaft.einstellungen.test.tsx.
    expect(loadBZ).toHaveBeenCalledWith([{ mapped: 'bz' }]);
    expect(loadBE).toHaveBeenCalledWith([{ mapped: 'be' }]);
    expect(loadE).toHaveBeenCalledWith([{ mapped: 'ewt' }]);
    expect(loadN).toHaveBeenCalledWith([{ mapped: 'n' }]);

    expect(getBereitschaftsZeitraumDatenMock).toHaveBeenCalledWith(expectedBZ, undefined, { scope: 'all' });
    expect(getBereitschaftsEinsatzDatenMock).toHaveBeenCalledWith(expectedBE, undefined, { scope: 'all' });
    expect(getEwtDatenMock).toHaveBeenCalledWith(expectedEWT, undefined, { scope: 'all' });
    expect(getNebengeldDatenMock).toHaveBeenCalledWith(expectedN, undefined, { scope: 'all' });

    expect(generateEingabeMaskeEinstellungenMock).toHaveBeenCalledWith(vorgabenU);
    expect(publishDataChangedMock).toHaveBeenCalledTimes(1);
    // scheduleAutoSave wird nicht mehr direkt aufgerufen — AutoSave reagiert
    // via Event-Listener auf das publishEvent('data:changed', ...)-Event am Ende
    expect(storageRemoveMock).toHaveBeenCalledWith('dataServer');
  });

  it('laedt den data-Teil nur bei vorhandener Tabelle und behaelt Storage/Filter bei Chunk-Fehler', async () => {
    const loadBZ = vi.fn();
    createTable('tableBZ', loadBZ);
    const setFilterBZ = (
      document.querySelector('#tableBZ') as unknown as { instance: { rows: { setFilter: ReturnType<typeof vi.fn> } } }
    ).instance.rows.setFilter;
    const serverBZ = [{ tag: 'bz' }];
    const serverN = [{ tag: 'n' }];
    const dataServer = { BZ: serverBZ, N: serverN };
    storageGetMock.mockImplementation((key: string) => {
      if (key === 'dataServer') return dataServer;
      if (key === 'Monat') return 3;
      return undefined;
    });
    const loadSpy = vi.spyOn(featureRegistry, 'load').mockRejectedValue(new Error('Chunk nicht ladbar'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await overwriteUserDaten();

    // Nur BZ hat eine Tabelle im DOM: der data-Teil wird genau einmal (fuer ber) angefragt, N ohne Tabelle nie.
    expect(loadSpy).toHaveBeenCalledTimes(1);
    expect(loadSpy).toHaveBeenCalledWith('ber', 'data');
    expect(errorSpy).toHaveBeenCalled();
    // Storage und Filter werden trotz Fehler gesetzt, Tabellen-Load entfaellt.
    expect(storageSetMock).toHaveBeenCalledWith('dataBZ', serverBZ);
    expect(storageSetMock).toHaveBeenCalledWith('dataN', serverN);
    expect(loadBZ).not.toHaveBeenCalled();
    expect(setFilterBZ).toHaveBeenCalledTimes(1);
    expect(publishDataChangedMock).toHaveBeenCalledTimes(1);
    expect(storageRemoveMock).toHaveBeenCalledWith('dataServer');
  });

  it('funktioniert mit leerem dataServer und entfernt trotzdem dataServer', async () => {
    storageGetMock.mockImplementation((key: string) => {
      if (key === 'dataServer') return {};
      if (key === 'Monat') return 3;
      return undefined;
    });

    await overwriteUserDaten();

    expect(storageSetMock).not.toHaveBeenCalled();
    expect(publishDataChangedMock).toHaveBeenCalledTimes(1);
    expect(storageRemoveMock).toHaveBeenCalledWith('dataServer');
  });

  it('setFilter-Callbacks filtern korrekt nach Monat (BZ, BE, EWT, N)', async () => {
    const setFilterBZ = vi.fn();
    const setFilterBE = vi.fn();
    const setFilterE = vi.fn();
    const setFilterN = vi.fn();

    function createTableWithFilter(
      id: string,
      loadSpy: ReturnType<typeof vi.fn>,
      setFilterSpy: ReturnType<typeof vi.fn>,
    ): void {
      const table = document.createElement('table') as HTMLTableElement & {
        instance: { rows: { load: ReturnType<typeof vi.fn>; setFilter: ReturnType<typeof vi.fn> } };
      };
      table.id = id;
      table.instance = { rows: { load: loadSpy, setFilter: setFilterSpy } };
      document.body.appendChild(table);
    }

    createTableWithFilter('tableVE', vi.fn(), vi.fn());
    createTableWithFilter('tableBZ', vi.fn(), setFilterBZ);
    createTableWithFilter('tableBE', vi.fn(), setFilterBE);
    createTableWithFilter('tableE', vi.fn(), setFilterE);
    createTableWithFilter('tableN', vi.fn(), setFilterN);

    storageGetMock.mockImplementation((key: string) => {
      if (key === 'dataServer')
        return {
          vorgabenU: { Pers: { Vorname: 'Test' }, VorgabenB: {}, Einstellungen: { aktivierteTabs: [] } },
          BZ: { 3: [{ bz: 1 }] },
          BE: { 3: [{ be: 1 }] },
          EWT: { 3: [{ ewt: 1 }] },
          N: { 3: [{ n: 1 }] },
        };
      if (key === 'Monat') return 3;
      return undefined;
    });

    getBereitschaftsZeitraumDatenMock.mockReturnValue([]);
    getBereitschaftsEinsatzDatenMock.mockReturnValue([]);
    getEwtDatenMock.mockReturnValue([]);
    getNebengeldDatenMock.mockReturnValue([]);

    await overwriteUserDaten();

    // setFilter-Callbacks aufrufen, um die Arrow-Functions zu covern
    const bzFilter = setFilterBZ.mock.calls[0]?.[0] as (row: unknown) => boolean;
    const beFilter = setFilterBE.mock.calls[0]?.[0] as (row: unknown) => boolean;
    const eFilter = setFilterE.mock.calls[0]?.[0] as (row: unknown) => boolean;
    const nFilter = setFilterN.mock.calls[0]?.[0] as (row: unknown) => boolean;

    expect(bzFilter).toBeDefined();
    expect(beFilter).toBeDefined();
    expect(eFilter).toBeDefined();
    expect(nFilter).toBeDefined();

    // Callbacks mit März-Daten aufrufen → geben true zurück (Monat 3)
    expect(bzFilter({ Beginn: '2023-03-15T08:00', Ende: '2023-03-16T08:00', Pause: 0 })).toBe(true);
    expect(beFilter({ Tag: '15.03.2023', von: '08:00', bis: '16:00' })).toBe(true);
    expect(eFilter({ Tag: '2023-03-15', Buchungstag: '2023-03-15' })).toBe(true);
    expect(nFilter({ Tag: '15.03.2023', von: '08:00', bis: '16:00' })).toBe(true);
  });
});
