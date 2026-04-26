import { beforeEach, describe, expect, it, vi } from 'bun:test';

const {
  storageCompareMock,
  storageSetMock,
  buttonDisableMock,
  setMonatJahrMock,
  createSnackBarMock,
  getStoredMonatJahrMock,
} = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  storageCompareMock: vi.fn(),
  storageSetMock: vi.fn(),
  buttonDisableMock: vi.fn(),
  setMonatJahrMock: vi.fn(),
  createSnackBarMock: vi.fn(),
  getStoredMonatJahrMock: vi.fn(),
}));

vi.mock('@/infrastructure/storage/Storage', () => ({
  default: {
    compare: storageCompareMock,
    set: storageSetMock,
  },
}));

vi.mock('@/infrastructure/ui/buttonDisable', () => ({
  default: buttonDisableMock,
}));

vi.mock('@/features/Einstellungen/utils', () => ({
  setMonatJahr: setMonatJahrMock,
}));

vi.mock('@/infrastructure/ui/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

vi.mock('@/infrastructure/date/dateStorage', () => ({
  getStoredMonatJahr: getStoredMonatJahrMock,
}));

import changeMonatJahr from '@/features/Einstellungen/utils/changeMonatJahr';

function createInputs(monat: number, jahr: number): void {
  const monatInput = document.createElement('input');
  monatInput.id = 'Monat';
  monatInput.value = String(monat);
  document.body.appendChild(monatInput);

  const jahrInput = document.createElement('input');
  jahrInput.id = 'Jahr';
  jahrInput.value = String(jahr);
  document.body.appendChild(jahrInput);
}

function createTableWithFilter(id: string): ReturnType<typeof vi.fn> {
  const setFilterMock = vi.fn();
  const table = document.createElement('table') as HTMLTableElement & {
    instance: { rows: { setFilter: ReturnType<typeof vi.fn> } };
  };
  table.id = id;
  table.instance = { rows: { setFilter: setFilterMock } };
  document.body.appendChild(table);
  return setFilterMock;
}

describe('changeMonatJahr', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    getStoredMonatJahrMock.mockReturnValue({ monat: 3, jahr: 2026 });
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('wirft wenn #Monat oder #Jahr fehlt', () => {
    expect(() => changeMonatJahr()).toThrow('Input Monat oder Jahr nicht gefunden');
  });

  it('wirft wenn nur #Jahr fehlt', () => {
    const m = document.createElement('input');
    m.id = 'Monat';
    document.body.appendChild(m);
    expect(() => changeMonatJahr()).toThrow('Input Monat oder Jahr nicht gefunden');
  });

  it('deaktiviert Button wenn Jahr übereinstimmt und Monat gleich bleibt', () => {
    createInputs(3, 2026);
    // Jahr matcht, Monat matcht → nur buttonDisable(false)
    storageCompareMock.mockReturnValue(true);

    changeMonatJahr();

    expect(buttonDisableMock).toHaveBeenCalledWith(false);
    expect(buttonDisableMock).toHaveBeenCalledTimes(1);
    expect(createSnackBarMock).not.toHaveBeenCalled();
  });

  it('setzt Button disabled wenn Jahr übereinstimmt aber offline', () => {
    createInputs(3, 2026);
    storageCompareMock.mockReturnValue(true);
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    changeMonatJahr();

    expect(buttonDisableMock).toHaveBeenCalledWith(false);
    expect(buttonDisableMock).toHaveBeenCalledWith(true);
  });

  it('speichert Monat und zeigt Snackbar wenn Jahr matcht aber Monat ändert sich', () => {
    createInputs(4, 2026);
    // Jahr matcht, Monat matcht NICHT
    storageCompareMock.mockImplementation((key: string) => key === 'Jahr');

    createTableWithFilter('tableBZ');
    createTableWithFilter('tableBE');
    createTableWithFilter('tableE');
    createTableWithFilter('tableN');

    changeMonatJahr();

    expect(storageSetMock).toHaveBeenCalledWith('Monat', 4);
    expect(setMonatJahrMock).toHaveBeenCalledWith(2026, 4);
    expect(createSnackBarMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'success', message: 'Monat geändert.' }),
    );
  });

  it('filtert alle vier Tabellen wenn Monat geändert wird', () => {
    createInputs(4, 2026);
    storageCompareMock.mockImplementation((key: string) => key === 'Jahr');

    const bzFilter = createTableWithFilter('tableBZ');
    const beFilter = createTableWithFilter('tableBE');
    const eFilter = createTableWithFilter('tableE');
    const nFilter = createTableWithFilter('tableN');

    changeMonatJahr();

    expect(bzFilter).toHaveBeenCalledTimes(1);
    expect(beFilter).toHaveBeenCalledTimes(1);
    expect(eFilter).toHaveBeenCalledTimes(1);
    expect(nFilter).toHaveBeenCalledTimes(1);
  });

  it('blockiert Button und aktiviert Auswaehlen-Button wenn Jahr sich ändert (online)', () => {
    createInputs(3, 2025);
    storageCompareMock.mockReturnValue(false);

    createTableWithFilter('tableBZ');
    createTableWithFilter('tableBE');
    createTableWithFilter('tableE');
    createTableWithFilter('tableN');

    const btn = document.createElement('button');
    btn.id = 'btnAuswaehlen';
    btn.disabled = true;
    document.body.appendChild(btn);

    changeMonatJahr();

    expect(buttonDisableMock).toHaveBeenCalledWith(true);
    expect(btn.disabled).toBe(false);
  });

  it('aktiviert Auswaehlen-Button nicht wenn offline und Jahr sich ändert', () => {
    createInputs(3, 2025);
    storageCompareMock.mockReturnValue(false);
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    createTableWithFilter('tableBZ');
    createTableWithFilter('tableBE');
    createTableWithFilter('tableE');
    createTableWithFilter('tableN');

    const btn = document.createElement('button');
    btn.id = 'btnAuswaehlen';
    btn.disabled = true;
    document.body.appendChild(btn);

    changeMonatJahr();

    expect(btn.disabled).toBe(true);
  });

  it('filtert Tabellen ohne übergebenen Monat wenn Jahr sich ändert', () => {
    createInputs(3, 2025);
    storageCompareMock.mockReturnValue(false);

    const bzFilter = createTableWithFilter('tableBZ');
    createTableWithFilter('tableBE');
    createTableWithFilter('tableE');
    createTableWithFilter('tableN');

    changeMonatJahr();

    // setFilter wird mit der storedMonat-basierten Filterfunktion aufgerufen
    expect(bzFilter).toHaveBeenCalledTimes(1);
  });

  it('setFilter-Callbacks bei Monatwechsel filtern korrekt nach dem gewählten Monat', () => {
    createInputs(4, 2026); // neuer Monat = 4 (April)
    // Jahr matcht, Monat matcht NICHT
    storageCompareMock.mockImplementation((key: string) => key === 'Jahr');
    getStoredMonatJahrMock.mockReturnValue({ monat: 3, jahr: 2026 });

    const bzFilter = createTableWithFilter('tableBZ');
    const beFilter = createTableWithFilter('tableBE');
    const eFilter = createTableWithFilter('tableE');
    const nFilter = createTableWithFilter('tableN');

    changeMonatJahr();

    // Callbacks aufrufen, um Arrow-Functions zu covern
    const bzCb = bzFilter.mock.calls[0]?.[0] as (row: unknown) => boolean;
    const beCb = beFilter.mock.calls[0]?.[0] as (row: unknown) => boolean;
    const eCb = eFilter.mock.calls[0]?.[0] as (row: unknown) => boolean;
    const nCb = nFilter.mock.calls[0]?.[0] as (row: unknown) => boolean;

    expect(bzCb).toBeDefined();

    // April-Einträge → true; März-Einträge → false
    expect(bzCb({ beginB: '2026-04-10T08:00', endeB: '2026-04-11T08:00', pauseB: 0 })).toBe(true);
    expect(bzCb({ beginB: '2026-03-10T08:00', endeB: '2026-03-11T08:00', pauseB: 0 })).toBe(false);

    expect(beCb({ tagBE: '10.04.2026', von: '08:00', bis: '16:00' })).toBe(true);
    expect(beCb({ tagBE: '10.03.2026', von: '08:00', bis: '16:00' })).toBe(false);

    expect(eCb({ tagE: '2026-04-10', buchungstagE: '2026-04-10' })).toBe(true);
    expect(eCb({ tagE: '2026-03-10', buchungstagE: '2026-03-10' })).toBe(false);

    // Nebengeld: Monat UND Jahr >= 2024 müssen matchen
    expect(nCb({ tagN: '10.04.2026', von: '08:00', bis: '16:00' })).toBe(true);
    expect(nCb({ tagN: '10.03.2026', von: '08:00', bis: '16:00' })).toBe(false);
  });

  it('setFilter-Callbacks ohne Monatwechsel (Jahreswechsel) nutzen gespeicherten Monat', () => {
    createInputs(3, 2025);
    storageCompareMock.mockReturnValue(false); // Jahr matcht NICHT
    getStoredMonatJahrMock.mockReturnValue({ monat: 3, jahr: 2025 });

    const bzFilter = createTableWithFilter('tableBZ');
    const beFilter = createTableWithFilter('tableBE');
    const eFilter = createTableWithFilter('tableE');
    const nFilter = createTableWithFilter('tableN');

    changeMonatJahr();

    const bzCb = bzFilter.mock.calls[0]?.[0] as (row: unknown) => boolean;
    const beCb = beFilter.mock.calls[0]?.[0] as (row: unknown) => boolean;
    const eCb = eFilter.mock.calls[0]?.[0] as (row: unknown) => boolean;
    const nCb = nFilter.mock.calls[0]?.[0] as (row: unknown) => boolean;

    expect(bzCb({ beginB: '2025-03-10T08:00', endeB: '2025-03-11T08:00', pauseB: 0 })).toBe(true);
    expect(beCb({ tagBE: '10.03.2025', von: '08:00', bis: '16:00' })).toBe(true);
    expect(eCb({ tagE: '2025-03-10', buchungstagE: '2025-03-10' })).toBe(true);
    expect(nCb({ tagN: '10.03.2025', von: '08:00', bis: '16:00' })).toBe(true);
  });
});
