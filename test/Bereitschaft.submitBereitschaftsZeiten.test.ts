import { beforeEach, describe, expect, it, vi } from 'bun:test';
import type { IDatenBZ } from '../src/ts/interfaces';
import Storage from '../src/ts/infrastructure/storage/Storage';

const {
  calculateBereitschaftsZeitenMock,
  tableToArrayMock,
  createSnackBarMock,
  publishDataChangedMock,
  setLoadingMock,
  clearLoadingMock,
} = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  calculateBereitschaftsZeitenMock: vi.fn(),
  tableToArrayMock: vi.fn(),
  createSnackBarMock: vi.fn(),
  publishDataChangedMock: vi.fn(),
  setLoadingMock: vi.fn(),
  clearLoadingMock: vi.fn(),
}));

vi.mock('../src/ts/features/Bereitschaft/utils', () => ({
  calculateBereitschaftsZeiten: calculateBereitschaftsZeitenMock,
}));
vi.mock('../src/ts/infrastructure/data/tableToArray', () => ({ default: tableToArrayMock }));
vi.mock('../src/ts/infrastructure/ui/setLoading', () => ({ default: setLoadingMock }));
vi.mock('../src/ts/infrastructure/ui/clearLoading', () => ({ default: clearLoadingMock }));
vi.mock('../src/ts/class/CustomSnackbar', () => ({ createSnackBar: createSnackBarMock }));
vi.mock('../src/ts/core', () => ({ publishDataChanged: publishDataChangedMock }));

import submitBereitschaftsZeiten from '../src/ts/features/Bereitschaft/utils/submitBereitschaftsZeiten';

// ─── helpers ────────────────────────────────────────────────────────────────

interface ModalInputs {
  bA?: string;
  bAT?: string;
  bE?: string;
  bET?: string;
  nacht?: boolean;
  nA?: string;
  nAT?: string;
  nE?: string;
  nET?: string;
}

function createModal(inputs: ModalInputs = {}): HTMLDivElement {
  const div = document.createElement('div');
  const add = (id: string, value: string, type = 'text') => {
    const el = document.createElement('input') as HTMLInputElement;
    el.id = id;
    el.type = type;
    el.value = value;
    div.appendChild(el);
    return el;
  };

  if (inputs.bA !== undefined) add('bA', inputs.bA);
  if (inputs.bAT !== undefined) add('bAT', inputs.bAT);
  if (inputs.bE !== undefined) add('bE', inputs.bE);
  if (inputs.bET !== undefined) add('bET', inputs.bET);
  if (inputs.nA !== undefined) add('nA', inputs.nA);
  if (inputs.nAT !== undefined) add('nAT', inputs.nAT);
  if (inputs.nE !== undefined) add('nE', inputs.nE);
  if (inputs.nET !== undefined) add('nET', inputs.nET);

  const nacht = document.createElement('input') as HTMLInputElement;
  nacht.id = 'nacht';
  nacht.type = 'checkbox';
  nacht.checked = inputs.nacht ?? false;
  div.appendChild(nacht);

  return div;
}

function createFullModal(overrides: ModalInputs = {}): HTMLDivElement {
  return createModal({
    bA: '2023-04-05',
    bAT: '15:45',
    bE: '2023-04-12',
    bET: '07:00',
    nacht: false,
    nA: '2023-04-05',
    nAT: '19:45',
    nE: '2023-04-12',
    nET: '06:15',
    ...overrides,
  });
}

function createTableBZMock() {
  return {
    instance: {
      rows: {
        loadSmart: vi.fn(),
        setFilter: vi.fn(),
      },
      drawRows: vi.fn(),
    },
  };
}

function createBZ(beginB: string, endeB: string, id = '1'): IDatenBZ {
  return { _id: id, beginB, endeB, pauseB: 0 };
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('submitBereitschaftsZeiten', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    tableToArrayMock.mockReturnValue([]);
  });

  it('wirft Fehler wenn Eingabe-Inputs fehlen', async () => {
    const modal = createModal({}); // no inputs at all
    const tableBZ = createTableBZMock();

    await expect(submitBereitschaftsZeiten(modal as never, tableBZ as never)).rejects.toThrow(
      'Input Element nicht gefunden',
    );
  });

  it('zeigt Fehler-Snackbar wenn Nacht-Anfang vor Bereitschafts-Anfang liegt', async () => {
    const modal = createFullModal({
      nacht: true,
      nA: '2023-04-04', // one day before bA
      nAT: '15:45',
    });
    const tableBZ = createTableBZMock();
    Storage.set('Monat', 4);
    Storage.set('Jahr', 2023);

    await submitBereitschaftsZeiten(modal as never, tableBZ as never);

    expect(createSnackBarMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'error', message: expect.stringContaining('Nacht Anfang') }),
    );
    expect(publishDataChangedMock).not.toHaveBeenCalled();
  });

  it('zeigt Fehler-Snackbar wenn Nacht-Ende nach Bereitschafts-Ende liegt', async () => {
    const modal = createFullModal({
      nacht: true,
      nE: '2023-04-13', // one day after bE
      nET: '07:00',
    });
    const tableBZ = createTableBZMock();
    Storage.set('Monat', 4);
    Storage.set('Jahr', 2023);

    await submitBereitschaftsZeiten(modal as never, tableBZ as never);

    expect(createSnackBarMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'error', message: expect.stringContaining('Nacht Ende') }),
    );
    expect(publishDataChangedMock).not.toHaveBeenCalled();
  });

  it('zeigt Warn-Snackbar wenn Bereitschaftszeitraum bereits vorhanden (calculateBZ gibt false zurück)', async () => {
    const modal = createFullModal();
    const tableBZ = createTableBZMock();
    Storage.set('Monat', 4);
    Storage.set('Jahr', 2023);
    calculateBereitschaftsZeitenMock.mockReturnValue(false);

    await submitBereitschaftsZeiten(modal as never, tableBZ as never);

    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'warning' }));
    expect(publishDataChangedMock).not.toHaveBeenCalled();
  });

  it('fügt Bereitschaftszeitraum hinzu und aktualisiert Tabelle bei Erfolg (gleicher Monat)', async () => {
    const modal = createFullModal();
    const tableBZ = createTableBZMock();
    Storage.set('Monat', 4);
    Storage.set('Jahr', 2023);

    const newRow = createBZ('2023-04-05T15:45', '2023-04-12T07:00');
    calculateBereitschaftsZeitenMock.mockReturnValue([newRow]);
    Storage.set('dataBZ', []);

    await submitBereitschaftsZeiten(modal as never, tableBZ as never);

    expect(calculateBereitschaftsZeitenMock).toHaveBeenCalledTimes(1);
    expect(tableBZ.instance.rows.loadSmart).toHaveBeenCalled();
    expect(tableBZ.instance.rows.setFilter).toHaveBeenCalled();
    expect(tableBZ.instance.drawRows).toHaveBeenCalled();
    expect(publishDataChangedMock).toHaveBeenCalledTimes(1);
    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
  });

  it('berechnet beide Monatshälften bei Monatsgrenze (gleicher Jahrgang)', async () => {
    // Bereitschaft starts in April, ends in May
    const modal = createFullModal({
      bA: '2023-04-28',
      bAT: '15:45',
      bE: '2023-05-05',
      bET: '07:00',
      nacht: false,
    });
    const tableBZ = createTableBZMock();
    Storage.set('Monat', 4);
    Storage.set('Jahr', 2023);

    const aprilRow = createBZ('2023-04-28T15:45', '2023-05-01T00:00', 'april');
    const mayRow = createBZ('2023-05-01T00:00', '2023-05-05T07:00', 'may');
    // first call → April half, second call → May half
    calculateBereitschaftsZeitenMock.mockReturnValueOnce([aprilRow]).mockReturnValueOnce([mayRow]);
    Storage.set('dataBZ', []);

    await submitBereitschaftsZeiten(modal as never, tableBZ as never);

    expect(calculateBereitschaftsZeitenMock).toHaveBeenCalledTimes(2);
    expect(publishDataChangedMock).toHaveBeenCalledTimes(1);
  });
});
