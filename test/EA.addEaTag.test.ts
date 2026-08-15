import { beforeEach, describe, expect, it, vi } from 'bun:test';

import type { IDatenEA } from '@/core/types';

const { persistEaTableDataMock, createSnackBarMock } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  persistEaTableDataMock: vi.fn(),
  createSnackBarMock: vi.fn(),
}));

vi.mock('@/features/EA/utils', () => ({
  persistEaTableData: persistEaTableDataMock,
}));
vi.mock('@/infrastructure/ui/CustomSnackbar', () => ({ createSnackBar: createSnackBarMock }));

import addEaTag from '@/features/EA/utils/addEaTag';

function createEaData(overrides: Partial<IDatenEA> = {}): IDatenEA {
  return {
    Tag: '10.03.2026',
    Dauer: '08:00',
    Taetigkeit: 'Teamleiter in Vertretung LST Kirchheim',
    Entgeltgruppe: '105',
    ...overrides,
  };
}

function setupModal(
  overrides: Partial<Record<'Tag' | 'Dauer' | 'Taetigkeit' | 'Entgeltgruppe', string>> = {},
): HTMLDivElement {
  document.body.innerHTML = `
    <div id="modal-root">
      <input id="Tag" value="${overrides.Tag ?? '2026-03-10'}" />
      <input id="Dauer" value="${overrides.Dauer ?? '08:00'}" />
      <input id="Taetigkeit" value="${overrides.Taetigkeit ?? 'Teamleiter in Vertretung LST Kirchheim'}" />
      <input id="Entgeltgruppe" value="${overrides.Entgeltgruppe ?? '105'}" />
    </div>
  `;

  const modal = document.querySelector<HTMLDivElement>('#modal-root');
  if (!modal) throw new Error('modal root not found');
  return modal;
}

describe('addEaTag', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('wirft Fehler wenn Tag-Input fehlt', () => {
    document.body.innerHTML = `<div id="modal-root"></div>`;
    const modal = document.querySelector<HTMLDivElement>('#modal-root');
    if (!modal) throw new Error('modal root not found');

    expect(() => addEaTag(modal as never, null as never)).toThrow('Tag input not found');
  });

  it('legt Zeile an, speichert und liefert true im Standardpfad', () => {
    const modal = setupModal();

    const addMock = vi.fn();
    const existingRows = [
      { cells: createEaData({ Tag: '11.03.2026' }), _state: 'unchanged' },
      { cells: createEaData({ Tag: '12.03.2026' }), _state: 'unchanged' },
    ];
    const ftEA = {
      rows: { add: addMock, array: existingRows },
      getRows: vi.fn().mockReturnValue(existingRows),
    };

    const result = addEaTag(modal as never, ftEA as never);

    expect(result).toBe(true);
    expect(addMock).toHaveBeenCalledWith(
      expect.objectContaining({
        Tag: '10.03.2026',
        Dauer: '08:00',
        Taetigkeit: 'Teamleiter in Vertretung LST Kirchheim',
        Entgeltgruppe: '105',
      }),
    );
    expect(persistEaTableDataMock).toHaveBeenCalledWith(ftEA);
  });

  it('zeigt Warn-Snackbar, ueberspringt Add und liefert false, wenn fuer den Tag bereits ein Eintrag existiert', () => {
    const modal = setupModal({ Tag: '2026-03-10' });

    const addMock = vi.fn();
    const existingRow = { cells: createEaData({ Tag: '10.03.2026' }), _state: 'unchanged' as const };
    const ftEA = {
      rows: { add: addMock, array: [existingRow] },
      getRows: vi.fn().mockReturnValue([existingRow]),
    };

    const result = addEaTag(modal as never, ftEA as never);

    expect(result).toBe(false);
    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'warning' }));
    expect(addMock).not.toHaveBeenCalled();
    expect(persistEaTableDataMock).not.toHaveBeenCalled();
  });

  it('reaktiviert einen zum Loeschen vorgemerkten Eintrag fuer denselben Tag statt einen neuen zu erstellen', () => {
    const modal = setupModal({ Tag: '2026-03-10', Dauer: '07:30' });

    const addMock = vi.fn();
    const undoDeleteMock = vi.fn();
    const valMock = vi.fn();
    const deletedRow = {
      cells: createEaData({ Tag: '10.03.2026', Dauer: '06:00' }),
      _state: 'deleted' as const,
      undoDelete: undoDeleteMock,
      val: valMock,
    };
    const otherRow = { cells: createEaData({ Tag: '11.03.2026' }), _state: 'unchanged' as const };
    const ftEA = {
      rows: { add: addMock, array: [deletedRow, otherRow] },
      getRows: vi.fn().mockReturnValue([deletedRow, otherRow]),
    };

    const result = addEaTag(modal as never, ftEA as never);

    expect(result).toBe(true);
    expect(undoDeleteMock).toHaveBeenCalledTimes(1);
    expect(valMock).toHaveBeenCalledWith(expect.objectContaining({ Tag: '10.03.2026', Dauer: '07:30' }));
    expect(addMock).not.toHaveBeenCalled();
    expect(persistEaTableDataMock).toHaveBeenCalledWith(ftEA);
  });

  it('setzt EWT-Referenz aus dem optionalen Select, wenn vorhanden', () => {
    const modal = setupModal();
    const select = document.createElement('select');
    select.id = 'ewtRefSelect';
    const option = document.createElement('option');
    option.value = 'ewt-id-123';
    option.selected = true;
    select.appendChild(option);
    modal.appendChild(select);

    const addMock = vi.fn();
    const ftEA = {
      rows: { add: addMock, array: [] },
      getRows: vi.fn().mockReturnValue([]),
    };

    addEaTag(modal as never, ftEA as never);

    expect(addMock).toHaveBeenCalledWith(expect.objectContaining({ EWT: 'ewt-id-123' }));
  });
});
