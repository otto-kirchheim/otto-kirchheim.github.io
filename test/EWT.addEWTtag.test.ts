import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IDatenEWT, IVorgabenU } from '../src/ts/interfaces';

const { setNaechsterEwtTagMock, persistEwtTableDataMock, calculateEwtEintraegeMock } = vi.hoisted(() => ({
  setNaechsterEwtTagMock: vi.fn(),
  persistEwtTableDataMock: vi.fn(),
  calculateEwtEintraegeMock: vi.fn(),
}));

vi.mock('../src/ts/EWT/utils', () => ({
  setNaechsterEwtTag: setNaechsterEwtTagMock,
  persistEwtTableData: persistEwtTableDataMock,
  calculateEwtEintraege: calculateEwtEintraegeMock,
}));

import addEwtTag from '../src/ts/EWT/utils/addEwtTag';

function createEwtData(overrides: Partial<IDatenEWT> = {}): IDatenEWT {
  return {
    tagE: '2026-03-10',
    eOrtE: 'Fulda',
    schichtE: 'T',
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
      <input id="tagE" value="2026-03-10" />
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
  });

  it('wirft Fehler wenn TagE-Input fehlt', () => {
    document.body.innerHTML = `<div id="modal-root"></div>`;
    const modal = document.querySelector<HTMLDivElement>('#modal-root');
    if (!modal) throw new Error('modal root not found');

    expect(() => addEwtTag(modal as never, {} as IVorgabenU)).toThrow('TagE input not found');
  });

  it('wirft Fehler wenn Tabelle fehlt', () => {
    const modal = setupModal(true);
    calculateEwtEintraegeMock.mockReturnValue([createEwtData()]);

    expect(() => addEwtTag(modal as never, {} as IVorgabenU)).toThrow('TableE not found');
  });

  it('berechnet, speichert und setzt naechsten Tag im Standardpfad', () => {
    const modal = setupModal(true);
    const calculatedData = createEwtData({ beginE: '07:00', endeE: '15:00' });
    calculateEwtEintraegeMock.mockReturnValue([calculatedData]);

    const addMock = vi.fn();
    const existingRows = [
      { cells: createEwtData({ tagE: '2026-03-10' }), _state: 'unchanged' },
      { cells: createEwtData({ tagE: '2026-03-11' }), _state: 'unchanged' },
    ];
    const ftE = {
      rows: {
        add: addMock,
        array: existingRows,
      },
      getRows: vi.fn().mockReturnValue(existingRows),
    };

    const table = document.createElement('table') as HTMLTableElement & { instance: typeof ftE };
    table.id = 'tableE';
    table.instance = ftE;
    document.body.appendChild(table);

    addEwtTag(modal as never, {} as IVorgabenU);

    expect(calculateEwtEintraegeMock).toHaveBeenCalledTimes(1);
    expect(addMock).toHaveBeenCalledWith(calculatedData);
    expect(persistEwtTableDataMock).toHaveBeenCalledWith(ftE);
    expect(setNaechsterEwtTagMock).toHaveBeenCalledWith(
      10,
      existingRows.map(row => row.cells),
    );
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

    const table = document.createElement('table') as HTMLTableElement & { instance: typeof ftE };
    table.id = 'tableE';
    table.instance = ftE;
    document.body.appendChild(table);

    addEwtTag(modal as never, {} as IVorgabenU, true);

    expect(calculateEwtEintraegeMock).toHaveBeenCalledWith({} as IVorgabenU, [
      expect.objectContaining({ berechnen: true, tagE: '2026-03-10' }),
    ]);
    expect(addMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ab1E: '',
        anEE: '',
        abEE: '',
        an1E: '',
        berechnen: false,
      }),
    );
  });
});
