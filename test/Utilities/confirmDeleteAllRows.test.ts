import { beforeEach, describe, expect, it, mock, vi } from 'bun:test';

import type { confirmDeleteAllRows as ConfirmDeleteAllRowsFn } from '../../src/ts/utilities/confirmDeleteAllRows';
type ConfirmDeleteAllRows = typeof ConfirmDeleteAllRowsFn;

const { createSnackBarMock, buttonDisableMock, dateStorageMock } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  createSnackBarMock: vi.fn(),
  buttonDisableMock: vi.fn(),
  dateStorageMock: { getStoredMonatJahr: vi.fn() },
}));

async function loadConfirmDeleteAllRows(): Promise<ConfirmDeleteAllRows> {
  mock.module('../../src/ts/class/CustomSnackbar', () => ({
    createSnackBar: createSnackBarMock,
  }));
  mock.module('../../src/ts/utilities/buttonDisable', () => ({
    default: buttonDisableMock,
  }));
  mock.module('../../src/ts/utilities/dateStorage', () => ({
    getStoredMonatJahr: dateStorageMock.getStoredMonatJahr,
  }));

  const module = await import('../../src/ts/utilities/confirmDeleteAllRows');
  return module.confirmDeleteAllRows;
}

function makeRow(monat: number) {
  return { cells: { monat }, deleteRow: vi.fn() };
}

describe('confirmDeleteAllRows', () => {
  beforeEach(() => {
    mock.restore();
    vi.clearAllMocks();
    dateStorageMock.getStoredMonatJahr.mockReturnValue({ monat: 3, jahr: 2024 });
  });

  it('erstellt Snackbar mit korrekten Props', async () => {
    const confirmDeleteAllRows = await loadConfirmDeleteAllRows();
    confirmDeleteAllRows({ table: { rows: { array: [] } } as never, rowFilter: () => true, persist: vi.fn() });

    expect(createSnackBarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Möchtest du wirklich alle Zeilen löschen?',
        icon: 'question',
        status: 'error',
        dismissible: false,
        timeout: false,
        fixed: true,
      }),
    );
    const actions = createSnackBarMock.mock.calls[0][0].actions;
    expect(actions[0].text).toBe('Ja');
    expect(actions[1].text).toBe('Nein');
  });

  it('"Ja" löscht nur Zeilen des aktiven Monats und ruft persist auf', async () => {
    const confirmDeleteAllRows = await loadConfirmDeleteAllRows();
    const persistMock = vi.fn();
    const row3 = makeRow(3);
    const row4 = makeRow(4);
    const table = { rows: { array: [row3, row4] } };

    confirmDeleteAllRows({
      table: table as never,
      rowFilter: (cells: { monat: number }, m: number) => cells.monat === m,
      persist: persistMock,
    });

    createSnackBarMock.mock.calls[0][0].actions[0].function();

    expect(row3.deleteRow).toHaveBeenCalledTimes(1);
    expect(row4.deleteRow).not.toHaveBeenCalled();
    expect(buttonDisableMock).toHaveBeenCalledWith(false);
    expect(persistMock).toHaveBeenCalledWith(table);
  });

  it('"Nein" hat keine function und löscht nichts', async () => {
    const confirmDeleteAllRows = await loadConfirmDeleteAllRows();
    const row = makeRow(3);
    const persistMock = vi.fn();

    confirmDeleteAllRows({
      table: { rows: { array: [row] } } as never,
      rowFilter: () => true,
      persist: persistMock,
    });

    const neinAction = createSnackBarMock.mock.calls[0][0].actions[1];
    expect(neinAction.function).toBeUndefined();
    expect(row.deleteRow).not.toHaveBeenCalled();
    expect(persistMock).not.toHaveBeenCalled();
  });

  it('Zeilen anderer Monate werden nicht gelöscht', async () => {
    const confirmDeleteAllRows = await loadConfirmDeleteAllRows();
    const rows = [makeRow(3), makeRow(4), makeRow(5)];
    const persistMock = vi.fn();

    confirmDeleteAllRows({
      table: { rows: { array: rows } } as never,
      rowFilter: (cells: { monat: number }, m: number) => cells.monat === m,
      persist: persistMock,
    });

    createSnackBarMock.mock.calls[0][0].actions[0].function();

    expect(rows[0].deleteRow).toHaveBeenCalledTimes(1);
    expect(rows[1].deleteRow).not.toHaveBeenCalled();
    expect(rows[2].deleteRow).not.toHaveBeenCalled();
  });
});
