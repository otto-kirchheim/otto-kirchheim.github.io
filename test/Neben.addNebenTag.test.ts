import { beforeEach, describe, expect, it, mock, vi } from 'bun:test';

import type { IDatenN } from '../src/ts/interfaces';

const { saveTableDataNMock, createSnackBarMock } = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(
  () => ({
    saveTableDataNMock: vi.fn(),
    createSnackBarMock: vi.fn(),
  }),
);

type AddNebengeldTag = (form: HTMLDivElement | HTMLFormElement, tableN: any) => void;

async function loadAddNebengeldTag(): Promise<AddNebengeldTag> {
  mock.module('../src/ts/features/Neben/utils/persistNebengeldTableData', () => ({
    default: saveTableDataNMock,
  }));
  mock.module('../src/ts/class/CustomSnackbar', () => ({
    createSnackBar: createSnackBarMock,
  }));

  const module = await import('../src/ts/features/Neben/utils/addNebengeldTag');
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

    expect(() => addNebengeldTag(form, null)).toThrow("Select element with ID 'tagN' not found");
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

    expect(() => addNebengeldTag(form, null)).not.toThrow();
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

    expect(() => addNebengeldTag(form, null)).toThrow("Input element with ID 'anzahl040N' not found");
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

    expect(() => addNebengeldTag(form, null)).toThrow("Input element with ID 'AuftragN' not found");
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

    const form = document.querySelector<HTMLFormElement>('#form');
    if (!form) throw new Error('form not found');

    const select = form.querySelector<HTMLSelectElement>('#tagN');
    const auftrag = form.querySelector<HTMLInputElement>('#AuftragN');
    if (!select || !auftrag) throw new Error('input not found');
    select.selectedIndex = 0;

    addNebengeldTag(form, ftN);

    expect(addMock).toHaveBeenCalledWith(
      expect.objectContaining({ tagN: '2026-03-10', anzahl040N: 1, auftragN: 'A-123' }),
    );
    expect(saveTableDataNMock).toHaveBeenCalledWith(ftN);
    expect(select.options[0].disabled).toBe(true);
    expect(select.options[0].selected).toBe(false);
    expect(select.options[2].selected).toBe(true);
    expect(auftrag.value).toBe('');
  });

  it('zeigt Warn-Snackbar und überspringt Add bei bereits vorhandenem Tag', async () => {
    const addNebengeldTag = await loadAddNebengeldTag();

    // tagN must use DD.MM.YYYY format (as stored by the modal) for isSame() to work
    const data = createDataN('10.03.2026');
    document.body.innerHTML = `
      <form id="form">
        <select id="tagN">
          <option selected value='${JSON.stringify(data)}'>Tag</option>
        </select>
        <input id="anzahl040N" value="0" />
        <input id="AuftragN" value="" />
      </form>
    `;
    const form = document.querySelector<HTMLFormElement>('#form');
    if (!form) throw new Error('form not found');
    const select = form.querySelector<HTMLSelectElement>('#tagN');
    if (!select) throw new Error('select not found');
    select.selectedIndex = 0;

    const addMock = vi.fn();
    const ftN = {
      rows: {
        add: addMock,
        array: [{ _state: 'unchanged', cells: createDataN('10.03.2026') }],
      },
    };

    addNebengeldTag(form, ftN);

    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'warning' }));
    expect(addMock).not.toHaveBeenCalled();
    expect(saveTableDataNMock).not.toHaveBeenCalled();
  });
});
