import { beforeEach, describe, expect, it, mock, vi } from 'bun:test';

import type { IDatenN } from '../src/ts/interfaces';

const { saveTableDataNMock } = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  saveTableDataNMock: vi.fn(),
}));

type AddNebengeldTag = (form: HTMLDivElement | HTMLFormElement) => void;

async function loadAddNebengeldTag(): Promise<AddNebengeldTag> {
  mock.module('../src/ts/Neben/utils/persistNebengeldTableData', () => ({
    default: saveTableDataNMock,
  }));

  const module = await import('../src/ts/Neben/utils/addNebengeldTag');
  return module.default;
}

function createDataN(tagN = '2026-03-10'): IDatenN {
  return {
    tagN,
    beginN: '08:00',
    endeN: '10:00',
    anzahl040N: 0,
    auftragN: '',
  };
}

describe('addNebengeldTag', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mock.restore();
    vi.clearAllMocks();
  });

  it('wirft Fehler wenn #tagN fehlt', async () => {
    const addNebengeldTag = await loadAddNebengeldTag();

    document.body.innerHTML = `<form id="form"></form>`;
    const form = document.querySelector<HTMLFormElement>('#form');
    if (!form) throw new Error('form not found');

    expect(() => addNebengeldTag(form)).toThrow("Select element with ID 'tagN' not found");
  });

  it('beendet ohne Aktion wenn kein Eintrag selektiert ist', async () => {
    const addNebengeldTag = await loadAddNebengeldTag();

    document.body.innerHTML = `
      <form id="form">
        <select id="tagN"></select>
      </form>
    `;
    const form = document.querySelector<HTMLFormElement>('#form');
    if (!form) throw new Error('form not found');

    expect(() => addNebengeldTag(form)).not.toThrow();
    expect(saveTableDataNMock).not.toHaveBeenCalled();
  });

  it('wirft Fehler wenn #anzahl040N fehlt', async () => {
    const addNebengeldTag = await loadAddNebengeldTag();

    const data = createDataN();
    document.body.innerHTML = `
      <form id="form">
        <select id="tagN">
          <option selected value='${JSON.stringify(data)}'>Tag</option>
        </select>
      </form>
    `;
    const form = document.querySelector<HTMLFormElement>('#form');
    if (!form) throw new Error('form not found');
    const select = form.querySelector<HTMLSelectElement>('#tagN');
    if (!select) throw new Error('select not found');
    select.selectedIndex = 0;

    expect(() => addNebengeldTag(form)).toThrow("Input element with ID 'anzahl040N' not found");
  });

  it('wirft Fehler wenn #AuftragN fehlt', async () => {
    const addNebengeldTag = await loadAddNebengeldTag();

    const data = createDataN();
    document.body.innerHTML = `
      <form id="form">
        <select id="tagN">
          <option selected value='${JSON.stringify(data)}'>Tag</option>
        </select>
        <input id="anzahl040N" value="4" />
      </form>
    `;
    const form = document.querySelector<HTMLFormElement>('#form');
    if (!form) throw new Error('form not found');
    const select = form.querySelector<HTMLSelectElement>('#tagN');
    if (!select) throw new Error('select not found');
    select.selectedIndex = 0;

    expect(() => addNebengeldTag(form)).toThrow("Input element with ID 'AuftragN' not found");
  });

  it('wirft Fehler wenn Tabelle #tableN fehlt', async () => {
    const addNebengeldTag = await loadAddNebengeldTag();

    const data = createDataN();
    document.body.innerHTML = `
      <form id="form">
        <select id="tagN">
          <option selected value='${JSON.stringify(data)}'>Tag</option>
        </select>
        <input id="anzahl040N" value="4" />
        <input id="AuftragN" value="A-123" />
      </form>
    `;
    const form = document.querySelector<HTMLFormElement>('#form');
    if (!form) throw new Error('form not found');
    const select = form.querySelector<HTMLSelectElement>('#tagN');
    if (!select) throw new Error('select not found');
    select.selectedIndex = 0;

    expect(() => addNebengeldTag(form)).toThrow('table N nicht gefunden');
  });

  it('fuegt Daten hinzu, speichert Tabelle und waehlt naechsten freien Eintrag', async () => {
    const addNebengeldTag = await loadAddNebengeldTag();

    const dataA = createDataN('2026-03-10');
    const dataB = createDataN('2026-03-11');
    const dataC = createDataN('2026-03-12');

    document.body.innerHTML = `
      <form id="form">
        <select id="tagN">
          <option selected value='${JSON.stringify(dataA)}'>A</option>
          <option disabled value='${JSON.stringify(dataB)}'>B</option>
          <option value='${JSON.stringify(dataC)}'>C</option>
        </select>
        <input id="anzahl040N" value="1" />
        <input id="AuftragN" value="A-123" />
      </form>
    `;

    const addMock = vi.fn();
    const ftN = {
      rows: {
        add: addMock,
        array: [
          { _state: 'clean', cells: dataB },
          { _state: 'clean', cells: dataC },
        ],
      },
    };

    const table = document.createElement('table') as HTMLTableElement & { instance: typeof ftN };
    table.id = 'tableN';
    table.instance = ftN;
    document.body.appendChild(table);

    const form = document.querySelector<HTMLFormElement>('#form');
    if (!form) throw new Error('form not found');

    const select = form.querySelector<HTMLSelectElement>('#tagN');
    const auftrag = form.querySelector<HTMLInputElement>('#AuftragN');
    if (!select || !auftrag) throw new Error('input not found');
    select.selectedIndex = 0;

    addNebengeldTag(form);

    expect(addMock).toHaveBeenCalledWith(
      expect.objectContaining({ tagN: '2026-03-10', anzahl040N: 1, auftragN: 'A-123' }),
    );
    expect(saveTableDataNMock).toHaveBeenCalledWith(ftN);
    expect(select.options[0].disabled).toBe(true);
    expect(select.options[0].selected).toBe(false);
    expect(select.options[2].selected).toBe(true);
    expect(auftrag.value).toBe('');
  });
});
