import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IDatenEWT } from '../src/ts/interfaces';

const { saveTableDataEWTMock } = vi.hoisted(() => ({
  saveTableDataEWTMock: vi.fn(),
}));

vi.mock('../src/ts/EWT/utils', () => ({
  saveTableDataEWT: saveTableDataEWTMock,
}));

import addEventlistenerToggleBerechnen from '../src/ts/EWT/utils/addEventlistenerToggleBerechnen';

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

describe('addEventlistenerToggleBerechnen', () => {
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
    addEventlistenerToggleBerechnen.call(tableInstance);

    checkbox1.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    checkbox2.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(val1).toHaveBeenCalledWith(expect.objectContaining({ berechnen: true }));
    expect(val2).toHaveBeenCalledWith(expect.objectContaining({ berechnen: false }));
    expect(saveTableDataEWTMock).toHaveBeenCalledTimes(2);
    expect(saveTableDataEWTMock).toHaveBeenNthCalledWith(1, tableInstance);
    expect(saveTableDataEWTMock).toHaveBeenNthCalledWith(2, tableInstance);
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

    addEventlistenerToggleBerechnen.call({} as never);

    expect(() => checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true }))).not.toThrow();
    expect(saveTableDataEWTMock).not.toHaveBeenCalled();
  });

  it('ist no-op wenn keine Checkboxen vorhanden sind', () => {
    document.body.innerHTML = `<table id="tableE"><tbody></tbody></table>`;

    expect(() => addEventlistenerToggleBerechnen.call({} as never)).not.toThrow();
    expect(saveTableDataEWTMock).not.toHaveBeenCalled();
  });
});
