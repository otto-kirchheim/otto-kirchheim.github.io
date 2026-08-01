import { beforeEach, describe, expect, it, vi } from 'bun:test';

import type { IDatenEWT, IVorgabenU } from '@/core/types';

const {
  setNaechsterEwtTagMock,
  persistEwtTableDataMock,
  calculateEwtEintraegeMock,
  calculateBuchungstagEwtMock,
  createSnackBarMock,
} = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  setNaechsterEwtTagMock: vi.fn(),
  persistEwtTableDataMock: vi.fn(),
  calculateEwtEintraegeMock: vi.fn(),
  calculateBuchungstagEwtMock: vi.fn(),
  createSnackBarMock: vi.fn(),
}));

vi.mock('@/features/EWT/utils', () => ({
  setNaechsterEwtTag: setNaechsterEwtTagMock,
  persistEwtTableData: persistEwtTableDataMock,
  calculateEwtEintraege: calculateEwtEintraegeMock,
  calculateBuchungstagEwt: calculateBuchungstagEwtMock,
}));
vi.mock('@/infrastructure/ui/CustomSnackbar', () => ({ createSnackBar: createSnackBarMock }));

import addEwtTag from '@/features/EWT/utils/addEwtTag';

function createEwtData(overrides: Partial<IDatenEWT> = {}): IDatenEWT {
  return {
    Tag: '2026-03-10',
    Einsatzort: 'Fulda',
    Schicht: 'T',
    abWE: '',
    ab1E: '',
    anEE: '',
    beginE: '',
    endeE: '',
    abEE: '',
    an1E: '',
    anWE: '',
    berechnen: true,
    ...overrides,
  };
}

function setupModal(checked = true): HTMLDivElement {
  document.body.innerHTML = `
    <div id="modal-root">
      <input id="Tag" value="2026-03-10" />
      <select id="EOrt"><option value="Fulda" selected>Fulda</option></select>
      <select id="Schicht"><option value="T" selected>T</option></select>
      <input id="berechnen1" type="checkbox" ${checked ? 'checked' : ''} />
    </div>
  `;

  const modal = document.querySelector<HTMLDivElement>('#modal-root');
  if (!modal) throw new Error('modal root not found');
  return modal;
}

describe('addEWTtag', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    calculateBuchungstagEwtMock.mockReturnValue('2026-03-10');
  });

  it('wirft Fehler wenn TagE-Input fehlt', () => {
    document.body.innerHTML = `<div id="modal-root"></div>`;
    const modal = document.querySelector<HTMLDivElement>('#modal-root');
    if (!modal) throw new Error('modal root not found');

    expect(() => addEwtTag(modal as never, {} as IVorgabenU, false, null as never)).toThrow('TagE input not found');
  });

  it('berechnet, speichert und setzt naechsten Tag im Standardpfad', () => {
    const modal = setupModal(true);
    const calculatedData = createEwtData({ beginE: '07:00', endeE: '15:00' });
    calculateEwtEintraegeMock.mockReturnValue([calculatedData]);

    const addMock = vi.fn();
    const existingRows = [
      { cells: createEwtData({ Tag: '2026-03-10' }), _state: 'unchanged' },
      { cells: createEwtData({ Tag: '2026-03-11' }), _state: 'unchanged' },
    ];
    const ftE = {
      rows: {
        add: addMock,
        array: existingRows,
      },
      getRows: vi.fn().mockReturnValue(existingRows),
    };

    addEwtTag(modal as never, {} as IVorgabenU, false, ftE as never);

    expect(calculateEwtEintraegeMock).toHaveBeenCalledTimes(1);
    expect(calculateBuchungstagEwtMock).toHaveBeenCalledWith(calculatedData);
    expect(addMock).toHaveBeenCalledWith(expect.objectContaining({ ...calculatedData, Buchungstag: '2026-03-10' }));
    expect(persistEwtTableDataMock).toHaveBeenCalledWith(ftE);
    expect(setNaechsterEwtTagMock).toHaveBeenCalledWith(
      10,
      existingRows.map(row => row.cells),
    );
  });

  it('zeigt Warn-Snackbar und überspringt Add bei identischem Duplikat', () => {
    const modal = setupModal(true);
    const existingData = createEwtData({ Tag: '2026-03-10', Schicht: 'T', Einsatzort: 'Fulda', berechnen: true });
    calculateEwtEintraegeMock.mockReturnValue([existingData]);

    const addMock = vi.fn();
    const existingRow = { cells: existingData, _state: 'unchanged' as const };
    const ftE = {
      rows: { add: addMock, array: [existingRow] },
      getRows: vi.fn().mockReturnValue([existingRow]),
    };

    addEwtTag(modal as never, {} as IVorgabenU, false, ftE as never);

    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'warning' }));
    expect(addMock).not.toHaveBeenCalled();
    expect(persistEwtTableDataMock).not.toHaveBeenCalled();
  });

  it('reaktiviert einen zum Löschen vorgemerkten Eintrag für denselben Tag statt einen neuen zu erstellen', () => {
    const modal = setupModal(true);
    const calculatedData = createEwtData({ Tag: '2026-03-10', beginE: '07:00', endeE: '15:00' });
    calculateEwtEintraegeMock.mockReturnValue([calculatedData]);

    const addMock = vi.fn();
    const undoDeleteMock = vi.fn();
    const valMock = vi.fn();
    const deletedRow = {
      cells: createEwtData({ Tag: '2026-03-10', beginE: '06:00', endeE: '14:00' }),
      _state: 'deleted' as const,
      undoDelete: undoDeleteMock,
      val: valMock,
    };
    const otherRow = { cells: createEwtData({ Tag: '2026-03-11' }), _state: 'unchanged' as const };
    const ftE = {
      rows: { add: addMock, array: [deletedRow, otherRow] },
      getRows: vi.fn().mockReturnValue([deletedRow, otherRow]),
    };

    addEwtTag(modal as never, {} as IVorgabenU, false, ftE as never);

    expect(undoDeleteMock).toHaveBeenCalledTimes(1);
    expect(valMock).toHaveBeenCalledWith(expect.objectContaining({ ...calculatedData, Buchungstag: '2026-03-10' }));
    expect(addMock).not.toHaveBeenCalled();
    expect(persistEwtTableDataMock).toHaveBeenCalledWith(ftE);
  });

  it('setzt im berechneBuero-Pfad bestimmte Felder zurueck', () => {
    const modal = setupModal(false);
    const calculatedData = createEwtData({
      ab1E: '08:00',
      anEE: '08:10',
      abEE: '15:05',
      an1E: '15:15',
      berechnen: true,
    });
    calculateEwtEintraegeMock.mockReturnValue([calculatedData]);

    const addMock = vi.fn();
    const ftE = {
      rows: {
        add: addMock,
        array: [],
      },
      getRows: vi.fn().mockReturnValue([]),
    };

    addEwtTag(modal as never, {} as IVorgabenU, true, ftE as never);

    expect(calculateEwtEintraegeMock).toHaveBeenCalledWith({} as IVorgabenU, [
      expect.objectContaining({ berechnen: true, Tag: '2026-03-10' }),
    ]);
    expect(addMock).toHaveBeenCalledWith(
      expect.objectContaining({
        Buchungstag: '2026-03-10',
        ab1E: '',
        anEE: '',
        abEE: '',
        an1E: '',
        berechnen: false,
      }),
    );
  });
});
