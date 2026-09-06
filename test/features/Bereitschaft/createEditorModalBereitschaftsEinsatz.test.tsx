import { huelleMock, inputMock } from '../../reactRender';
import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { createElement as h } from 'react';

import { createCustomTable, type CustomTable } from '@/infrastructure/table/CustomTable';
import type { IDatenBE } from '@/types';

const {
  showModalMock,
  createSnackBarMock,
  classifyBzCoverageMock,
  ensureCompleteBzSyncedMock,
  getBereitschaftsZeitraumDatenMock,
  hasConflictingLre1Mock,
  hasLre12TooCloseMock,
  hasOverlapMock,
  persistBereitschaftsEinsatzTableDataMock,
  storageGetMock,
  hideMock,
  onEventMock,
} = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  showModalMock: vi.fn(),
  createSnackBarMock: vi.fn(),
  classifyBzCoverageMock: vi.fn(),
  ensureCompleteBzSyncedMock: vi.fn(),
  getBereitschaftsZeitraumDatenMock: vi.fn(),
  hasConflictingLre1Mock: vi.fn(),
  hasLre12TooCloseMock: vi.fn(),
  hasOverlapMock: vi.fn(),
  persistBereitschaftsEinsatzTableDataMock: vi.fn(),
  storageGetMock: vi.fn(),
  hideMock: vi.fn(),
  onEventMock: vi.fn(),
}));

vi.mock('@/components', () => ({
  schliesseModal: hideMock,
  showModal: showModalMock,
  MyFormModal: huelleMock,
  MyModalBody: huelleMock,
  MyInput: inputMock,
  MySelect: (props: Record<string, unknown>) => h('select', props),
}));

vi.mock('@/infrastructure/ui/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

vi.mock('@/infrastructure/storage/Storage', () => ({
  default: { get: storageGetMock },
}));

vi.mock('@/features/Bereitschaft/utils', () => ({
  classifyBzCoverage: classifyBzCoverageMock,
  ensureCompleteBzSynced: ensureCompleteBzSyncedMock,
  getBereitschaftsZeitraumDaten: getBereitschaftsZeitraumDatenMock,
  isBzUnsynced: (bz: { _id?: string; __localState?: string }) => !bz._id || bz.__localState === 'modified',
  hasConflictingLre1: hasConflictingLre1Mock,
  hasLre12TooClose: hasLre12TooCloseMock,
  hasOverlap: hasOverlapMock,
  persistBereitschaftsEinsatzTableData: persistBereitschaftsEinsatzTableDataMock,
}));

vi.mock('@/core', () => ({
  onEvent: onEventMock,
}));

import EditorModalBE from '@/features/Bereitschaft/components/createEditorModalBereitschaftsEinsatz';

const BE_COLUMNS = [
  { name: 'Tag', title: 'Datum', type: 'Date' },
  { name: 'Auftragsnummer', title: 'Auftrags-Nr.', longTitle: 'SAP-Nr / Einsatzbeschreibung', type: 'text' },
  { name: 'Beginn', title: 'Von', type: 'time' },
  { name: 'Ende', title: 'Bis', type: 'time' },
  { name: 'LRE', title: 'LRE' },
  { name: 'PrivatKm', title: 'Privat Km', longTitle: 'Kilometer Privatfahrzeug', type: 'number' },
];

let tableCounter = 0;

function makeTable(rows: IDatenBE[] = []): CustomTable<IDatenBE> {
  const table = document.createElement('table');
  table.id = `tableBE${tableCounter++}`;
  document.body.appendChild(table);
  return createCustomTable<IDatenBE>(table.id, { columns: BE_COLUMNS, rows });
}

function setupShowModalMock(checkValidity = true): void {
  showModalMock.mockImplementation((vnode: { props: { myRef: { current: HTMLFormElement | null } } }) => {
    const form = document.createElement('form');
    form.checkValidity = () => checkValidity;
    vnode.props.myRef.current = form;
    const modal = document.createElement('div');
    document.body.appendChild(modal);
    return modal;
  });
}

function getForm(): HTMLFormElement {
  const vnode = showModalMock.mock.calls[0][0] as { props: { myRef: { current: HTMLFormElement | null } } };
  return vnode.props.myRef.current as HTMLFormElement;
}

function getSubmit(): (event: Event) => Promise<void> {
  return showModalMock.mock.calls[0][0].props.onSubmit as (event: Event) => Promise<void>;
}

function setFormValues(
  form: HTMLElement,
  values: { Tag: string; Auftragsnummer: string; Beginn: string; Ende: string; LRE: string; PrivatKm: string },
): void {
  for (const [id, value] of Object.entries(values)) {
    let input = form.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`);
    if (!input) {
      input = document.createElement(id === 'LRE' ? 'select' : 'input');
      input.id = id;
      form.appendChild(input);
    }
    if (id === 'LRE') {
      const option = document.createElement('option');
      option.value = value;
      input.appendChild(option);
    }
    input.value = value;
  }
}

const VALID_VALUES = {
  Tag: '2025-06-10',
  Auftragsnummer: 'AUF-1',
  Beginn: '08:00',
  Ende: '10:00',
  LRE: 'LRE 1',
  PrivatKm: '0',
};
const START_BZ = { _id: 'bz-start', Beginn: '2025-06-10T00:00:00.000Z', Ende: '2025-06-20T00:00:00.000Z', Pause: 0 };

describe('EditorModalBE', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    storageGetMock.mockImplementation((key: string) => (key === 'Jahr' ? 2025 : 6));
    getBereitschaftsZeitraumDatenMock.mockReturnValue([]);
    onEventMock.mockReturnValue(vi.fn());
    classifyBzCoverageMock.mockReturnValue({ kind: 'complete', startBz: START_BZ, endBz: START_BZ });
    ensureCompleteBzSyncedMock.mockImplementation(coverage => Promise.resolve(coverage));
    hasOverlapMock.mockReturnValue(false);
    hasConflictingLre1Mock.mockReturnValue(false);
    hasLre12TooCloseMock.mockReturnValue(false);
  });

  it('setzt modal.row auf die übergebene Zeile bzw. Tabelle', () => {
    const table = makeTable([]);
    setupShowModalMock();

    EditorModalBE(table, 'Titel');

    const modal = showModalMock.mock.results[0].value as { row: unknown };
    expect(modal.row).toBe(table);
  });

  it('speichert eine neue Zeile per rows.add(), wenn die Deckung vollständig ist', async () => {
    const table = makeTable([]);
    setupShowModalMock();
    EditorModalBE(table, 'Hinzufügen');
    setFormValues(getForm(), VALID_VALUES);

    await getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

    expect(table.rows.array.length).toBe(1);
    expect(hideMock).toHaveBeenCalledTimes(1);
    expect(persistBereitschaftsEinsatzTableDataMock).toHaveBeenCalledWith(table);
  });

  it('aktualisiert eine bestehende Zeile per row.val()', async () => {
    const table = makeTable([{ _id: 'be1', ...VALID_VALUES, PrivatKm: 0 } as unknown as IDatenBE]);
    const row = table.rows.array[0];
    const originalCells = row.cells;
    setupShowModalMock();
    EditorModalBE(row, 'Bearbeiten');
    setFormValues(getForm(), { ...VALID_VALUES, PrivatKm: '5' });

    await getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

    expect(row.cells.PrivatKm).toBe(5);
    expect(hasOverlapMock).toHaveBeenCalledWith(expect.anything(), expect.anything(), originalCells);
  });

  it('bricht mit Lücken-Hinweis ab, wenn die Deckung eine Lücke ist', async () => {
    classifyBzCoverageMock.mockReturnValue({ kind: 'gap', startBz: START_BZ, endBz: START_BZ });
    const table = makeTable([]);
    setupShowModalMock();
    EditorModalBE(table, 'Hinzufügen');
    setFormValues(getForm(), VALID_VALUES);

    await getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

    expect(createSnackBarMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Lücke') }),
    );
    expect(table.rows.array.length).toBe(0);
  });

  it('bricht mit generischem Hinweis ab, wenn kein passender Zeitraum existiert (partial)', async () => {
    classifyBzCoverageMock.mockReturnValue({ kind: 'partial', startBz: undefined, endBz: undefined });
    const table = makeTable([]);
    setupShowModalMock();
    EditorModalBE(table, 'Hinzufügen');
    setFormValues(getForm(), VALID_VALUES);

    await getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

    expect(createSnackBarMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Kein passender Bereitschaftszeitraum') }),
    );
  });

  it('bricht ab, wenn der Bereitschaftszeitraum noch keine gespeicherte ID hat', async () => {
    classifyBzCoverageMock.mockReturnValue({
      kind: 'complete',
      startBz: { ...START_BZ, _id: undefined },
      endBz: { ...START_BZ, _id: undefined },
    });
    const table = makeTable([]);
    setupShowModalMock();
    EditorModalBE(table, 'Hinzufügen');
    setFormValues(getForm(), VALID_VALUES);

    await getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

    expect(createSnackBarMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('noch nicht gespeichert') }),
    );
    expect(table.rows.array.length).toBe(0);
  });

  it('bricht bei überschneidenden Einsätzen ab', async () => {
    hasOverlapMock.mockReturnValue(true);
    const table = makeTable([]);
    setupShowModalMock();
    EditorModalBE(table, 'Hinzufügen');
    setFormValues(getForm(), VALID_VALUES);

    await getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

    expect(createSnackBarMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('nicht überschneiden') }),
    );
    expect(table.rows.array.length).toBe(0);
  });

  it('bricht ab, wenn bereits ein LRE 1 im Zeitraum existiert', async () => {
    hasConflictingLre1Mock.mockReturnValue(true);
    const table = makeTable([]);
    setupShowModalMock();
    EditorModalBE(table, 'Hinzufügen');
    setFormValues(getForm(), { ...VALID_VALUES, LRE: 'LRE 1' });

    await getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

    expect(createSnackBarMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('bereits ein LRE 1') }),
    );
    expect(table.rows.array.length).toBe(0);
  });

  it('prüft LRE1-Konflikt nicht, wenn LRE ungleich "LRE 1" ist', async () => {
    hasConflictingLre1Mock.mockReturnValue(true);
    const table = makeTable([]);
    setupShowModalMock();
    EditorModalBE(table, 'Hinzufügen');
    setFormValues(getForm(), { ...VALID_VALUES, LRE: 'LRE 2' });

    await getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

    expect(table.rows.array.length).toBe(1);
  });

  it('bricht ab, wenn LRE 1/2 zu dicht an einem vorherigen Einsatz liegt', async () => {
    hasLre12TooCloseMock.mockReturnValue(true);
    const table = makeTable([]);
    setupShowModalMock();
    EditorModalBE(table, 'Hinzufügen');
    setFormValues(getForm(), { ...VALID_VALUES, LRE: 'LRE 2' });

    await getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

    expect(createSnackBarMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('ohne x') }),
    );
    expect(table.rows.array.length).toBe(0);
  });

  it('prüft die 10-Minuten-Regel nicht für LRE 3', async () => {
    hasLre12TooCloseMock.mockReturnValue(true);
    const table = makeTable([]);
    setupShowModalMock();
    EditorModalBE(table, 'Hinzufügen');
    setFormValues(getForm(), { ...VALID_VALUES, LRE: 'LRE 3' });

    await getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

    expect(table.rows.array.length).toBe(1);
  });

  it('bricht ohne Aktion ab, wenn das Formular ungültig ist', async () => {
    const table = makeTable([]);
    setupShowModalMock(false);
    EditorModalBE(table, 'Hinzufügen');

    const preventDefault = vi.fn();
    await getSubmit()({ preventDefault } as unknown as Event);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(persistBereitschaftsEinsatzTableDataMock).not.toHaveBeenCalled();
  });

  it('behandelt einen über Mitternacht laufenden Einsatz (Ende vor Beginn -> +1 Tag)', async () => {
    const table = makeTable([]);
    setupShowModalMock();
    EditorModalBE(table, 'Hinzufügen');
    setFormValues(getForm(), { ...VALID_VALUES, Beginn: '22:00', Ende: '02:00' });

    await getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

    expect(classifyBzCoverageMock).toHaveBeenCalled();
    const [, start, end] = classifyBzCoverageMock.mock.calls[0];
    expect(end.isAfter(start)).toBe(true);
    expect(table.rows.array.length).toBe(1);
  });
});
