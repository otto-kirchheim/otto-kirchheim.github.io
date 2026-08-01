import { beforeEach, describe, expect, it, mock, vi } from 'bun:test';

import type { IDatenN } from '@/core/types';

const { saveTableDataNMock, createSnackBarMock } = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(
  () => ({
    saveTableDataNMock: vi.fn(),
    createSnackBarMock: vi.fn(),
  }),
);

type AddNebengeldTag = (form: HTMLDivElement | HTMLFormElement, tableN: any) => void;

async function loadAddNebengeldTag(): Promise<AddNebengeldTag> {
  mock.module('@/infrastructure/data/persistTableData', () => ({
    default: saveTableDataNMock,
  }));
  mock.module('@/infrastructure/ui/CustomSnackbar', () => ({
    createSnackBar: createSnackBarMock,
  }));

  const module = await import('@/features/Neben/utils/addNebengeldTag');
  return module.default;
}

function createDataN(Tag = '2026-03-10'): IDatenN {
  return {
    Tag,
    Beginn: '08:00',
    Ende: '10:00',
    Auftragsnummer: '',
  };
}

describe('addNebengeldTag', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    mock.restore();
    vi.clearAllMocks();
  });

  it('wirft Fehler wenn #Tag fehlt', async () => {
    const addNebengeldTag = await loadAddNebengeldTag();

    document.body.innerHTML = `<form id="form"></form>`;
    const form = document.querySelector<HTMLFormElement>('#form');
    if (!form) throw new Error('form not found');

    expect(() => addNebengeldTag(form, null)).toThrow("Select element with ID 'Tag' not found");
  });

  it('beendet ohne Aktion wenn kein Eintrag selektiert ist', async () => {
    const addNebengeldTag = await loadAddNebengeldTag();

    document.body.innerHTML = `
      <form id="form">
        <select id="Tag"></select>
      </form>
    `;
    const form = document.querySelector<HTMLFormElement>('#form');
    if (!form) throw new Error('form not found');

    expect(() => addNebengeldTag(form, null)).not.toThrow();
    expect(saveTableDataNMock).not.toHaveBeenCalled();
  });

  it('wirft Fehler wenn #AuftragN fehlt', async () => {
    const addNebengeldTag = await loadAddNebengeldTag();

    const data = createDataN();
    document.body.innerHTML = `
      <form id="form">
        <select id="Tag">
          <option selected value='${JSON.stringify(data)}'>Tag</option>
        </select>
        <input data-zulage-input-code="040" value="1" />
      </form>
    `;
    const form = document.querySelector<HTMLFormElement>('#form');
    if (!form) throw new Error('form not found');
    const select = form.querySelector<HTMLSelectElement>('#Tag');
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
        <select id="Tag">
          <option selected value='${JSON.stringify(dataA)}'>A</option>
          <option disabled value='${JSON.stringify(dataB)}'>B</option>
          <option value='${JSON.stringify(dataC)}'>C</option>
        </select>
        <input data-zulage-input-code="040" value="1" />
        <input data-zulage-input-code="811" value="120" />
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

    const select = form.querySelector<HTMLSelectElement>('#Tag');
    const auftrag = form.querySelector<HTMLInputElement>('#AuftragN');
    if (!select || !auftrag) throw new Error('input not found');
    select.selectedIndex = 0;

    addNebengeldTag(form, ftN);

    expect(addMock).toHaveBeenCalledWith(
      expect.objectContaining({
        Tag: '2026-03-10',
        Auftragsnummer: 'A-123',
        Zulagen: [
          { Typ: '040', Wert: 1 },
          { Typ: '811', Wert: 120 },
        ],
        zulagenAnzeigeN: expect.stringContaining('040 '),
      }),
    );
    expect(saveTableDataNMock).toHaveBeenCalledWith('N', ftN);
    expect(select.options[0].disabled).toBe(true);
    expect(select.options[0].selected).toBe(false);
    expect(select.options[2].selected).toBe(true);
    expect(auftrag.value).toBe('');
  });

  it('zeigt Warn-Snackbar und überspringt Add bei bereits vorhandenem Tag', async () => {
    const addNebengeldTag = await loadAddNebengeldTag();

    // Tag must use DD.MM.YYYY format (as stored by the modal) for isSame() to work
    const data = createDataN('10.03.2026');
    document.body.innerHTML = `
      <form id="form">
        <select id="Tag">
          <option selected value='${JSON.stringify(data)}'>Tag</option>
        </select>
        <input data-zulage-input-code="040" value="0" />
        <input id="AuftragN" value="" />
      </form>
    `;
    const form = document.querySelector<HTMLFormElement>('#form');
    if (!form) throw new Error('form not found');
    const select = form.querySelector<HTMLSelectElement>('#Tag');
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

  it('reaktiviert einen zum Löschen vorgemerkten Eintrag für denselben Tag statt einen neuen zu erstellen', async () => {
    const addNebengeldTag = await loadAddNebengeldTag();

    // Tag must use DD.MM.YYYY format (as stored by the modal) for isSame() to work
    const data = createDataN('10.03.2026');
    document.body.innerHTML = `
      <form id="form">
        <select id="Tag">
          <option selected value='${JSON.stringify(data)}'>Tag</option>
        </select>
        <input data-zulage-input-code="040" value="1" />
        <input id="AuftragN" value="A-123" />
      </form>
    `;
    const form = document.querySelector<HTMLFormElement>('#form');
    if (!form) throw new Error('form not found');
    const select = form.querySelector<HTMLSelectElement>('#Tag');
    if (!select) throw new Error('select not found');
    select.selectedIndex = 0;

    const addMock = vi.fn();
    const undoDeleteMock = vi.fn();
    const valMock = vi.fn();
    const deletedRow = {
      _state: 'deleted',
      cells: createDataN('10.03.2026'),
      undoDelete: undoDeleteMock,
      val: valMock,
    };
    const ftN = {
      rows: {
        add: addMock,
        array: [deletedRow, { _state: 'unchanged', cells: createDataN('11.03.2026') }],
      },
    };

    addNebengeldTag(form, ftN);

    expect(undoDeleteMock).toHaveBeenCalledTimes(1);
    expect(valMock).toHaveBeenCalledWith(expect.objectContaining({ Tag: '10.03.2026', Auftragsnummer: 'A-123' }));
    expect(addMock).not.toHaveBeenCalled();
    expect(saveTableDataNMock).toHaveBeenCalledWith('N', ftN);
  });

  it('zeigt Warn-Snackbar und speichert nicht bei ungueltiger Zulagenkombination', async () => {
    const addNebengeldTag = await loadAddNebengeldTag();

    const data = createDataN('11.03.2026');
    document.body.innerHTML = `
      <form id="form">
        <select id="Tag">
          <option selected value='${JSON.stringify(data)}'>Tag</option>
        </select>
        <input data-zulage-input-code="839" value="120" />
        <input data-zulage-input-code="811" value="120" />
        <input id="AuftragN" value="NB-1" />
      </form>
    `;

    const addMock = vi.fn();
    const ftN = { rows: { add: addMock, array: [] } };

    const form = document.querySelector<HTMLFormElement>('#form');
    const select = form?.querySelector<HTMLSelectElement>('#Tag');
    if (!form || !select) throw new Error('form not found');
    select.selectedIndex = 0;

    addNebengeldTag(form, ftN);

    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'warning' }));
    expect(addMock).not.toHaveBeenCalled();
    expect(saveTableDataNMock).not.toHaveBeenCalled();
  });
});
