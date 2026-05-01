import { beforeEach, describe, expect, it, vi } from 'bun:test';

import type { IDatenEWT } from '@/core/types';

const { persistEwtTableDataMock } = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  persistEwtTableDataMock: vi.fn(),
}));

vi.mock('@/features/EWT/utils', () => ({
  persistEwtTableData: persistEwtTableDataMock,
}));

import attachBerechnenToggleListeners from '@/features/EWT/utils/attachBerechnenToggleListeners';

function createCells(): IDatenEWT {
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
    berechnen: false,
  };
}

describe('attachBerechnenToggleListeners', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('haengt Listener an und speichert geaenderte berechnen-Werte', () => {
    document.body.innerHTML = `
      <table id="tableE">
        <tbody>
          <tr id="row1"><td><input class="row-checkbox" type="checkbox" /></td></tr>
          <tr id="row2"><td><input class="row-checkbox" type="checkbox" checked /></td></tr>
        </tbody>
      </table>
    `;

    const row1 = document.querySelector<HTMLTableRowElement>('#row1') as HTMLTableRowElement & {
      data: { cells: IDatenEWT; val: (value: IDatenEWT) => void };
    };
    const row2 = document.querySelector<HTMLTableRowElement>('#row2') as HTMLTableRowElement & {
      data: { cells: IDatenEWT; val: (value: IDatenEWT) => void };
    };
    const checkbox1 = row1.querySelector<HTMLInputElement>('.row-checkbox');
    const checkbox2 = row2.querySelector<HTMLInputElement>('.row-checkbox');

    if (!checkbox1 || !checkbox2) throw new Error('checkbox not found');

    const val1 = vi.fn();
    const val2 = vi.fn();
    row1.data = { cells: createCells(), val: val1 };
    row2.data = { cells: createCells(), val: val2 };

    const tableInstance = { id: 'ftE' } as never;
    attachBerechnenToggleListeners.call(tableInstance);

    checkbox1.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    checkbox2.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(val1).toHaveBeenCalledWith(expect.objectContaining({ berechnen: true }));
    expect(val2).toHaveBeenCalledWith(expect.objectContaining({ berechnen: false }));
    expect(persistEwtTableDataMock).toHaveBeenCalledTimes(2);
    expect(persistEwtTableDataMock).toHaveBeenNthCalledWith(1, tableInstance);
    expect(persistEwtTableDataMock).toHaveBeenNthCalledWith(2, tableInstance);
  });

  it('macht nichts wenn eine Checkbox keine Row-Daten hat', () => {
    document.body.innerHTML = `
      <table id="tableE">
        <tbody>
          <tr><td><input class="row-checkbox" type="checkbox" /></td></tr>
        </tbody>
      </table>
    `;

    const checkbox = document.querySelector<HTMLInputElement>('.row-checkbox');
    if (!checkbox) throw new Error('checkbox not found');

    attachBerechnenToggleListeners.call({} as never);

    expect(() => checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow();
    expect(persistEwtTableDataMock).not.toHaveBeenCalled();
  });

  it('ist no-op wenn keine Checkboxen vorhanden sind', () => {
    document.body.innerHTML = `<table id="tableE"><tbody></tbody></table>`;

    expect(() => attachBerechnenToggleListeners.call({} as never)).not.toThrow();
    expect(persistEwtTableDataMock).not.toHaveBeenCalled();
  });
});
