import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { h, render } from 'preact';
import { createCustomTable, type CustomTable } from '@/infrastructure/table/CustomTable';
import type { IDatenBZ } from '@/types';

const {
  showModalMock,
  createSnackBarMock,
  getBereitschaftsZeitraumDatenMock,
  persistBereitschaftsZeitraumTableDataMock,
  storageGetMock,
  hideMock,
  getInstanceMock,
} = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  showModalMock: vi.fn(),
  createSnackBarMock: vi.fn(),
  getBereitschaftsZeitraumDatenMock: vi.fn(),
  persistBereitschaftsZeitraumTableDataMock: vi.fn(),
  storageGetMock: vi.fn(),
  hideMock: vi.fn(),
  getInstanceMock: vi.fn(),
}));

vi.mock('@/components', () => ({
  showModal: showModalMock,
  MyFormModal: (props: Record<string, unknown>) => h('div', props),
  MyModalBody: (props: Record<string, unknown>) => h('div', props),
  MyInput: (props: Record<string, unknown>) => h('input', props),
}));

vi.mock('@/infrastructure/ui/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

vi.mock('@/infrastructure/storage/Storage', () => ({
  default: { get: storageGetMock },
}));

vi.mock('@/features/Bereitschaft/utils', () => ({
  getBereitschaftsZeitraumDaten: getBereitschaftsZeitraumDatenMock,
  persistBereitschaftsZeitraumTableData: persistBereitschaftsZeitraumTableDataMock,
}));

vi.mock('bootstrap/js/dist/modal', () => ({
  default: { getInstance: getInstanceMock },
}));

import EditorModalBereitschaftsZeit from '@/features/Bereitschaft/components/createEditorModalBereitschaftsZeit';

const BZ_COLUMNS = [
  {
    name: 'Beginn',
    title: 'Von',
    longTitle: 'Beginn der Bereitschaft',
    type: 'DateTime',
    parser: (v: unknown) => String(v),
  },
  {
    name: 'Ende',
    title: 'Bis',
    longTitle: 'Ende der Bereitschaft',
    type: 'DateTime',
    parser: (v: unknown) => String(v),
  },
  { name: 'Pause', title: 'Pause', longTitle: 'Pause (Minuten)', type: 'number', parser: (v: unknown) => String(v) },
];

let tableCounter = 0;

function makeTable(rows: IDatenBZ[] = []): CustomTable<IDatenBZ> {
  const table = document.createElement('table');
  table.id = `tableBZ${tableCounter++}`;
  document.body.appendChild(table);
  return createCustomTable<IDatenBZ>(table.id, { columns: BZ_COLUMNS, rows });
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

function getSubmit(): (event: Event) => void {
  return showModalMock.mock.calls[0][0].props.onSubmit as (event: Event) => void;
}

function renderCapturedVnode(): HTMLDivElement {
  const container = document.createElement('div');
  render(showModalMock.mock.calls[0][0], container);
  return container;
}

function setFormValues(form: HTMLElement, beginn: string, ende: string, pause: string): void {
  const inputs = [
    ['Beginn', beginn],
    ['Ende', ende],
    ['Pause', pause],
  ] as const;
  for (const [id, value] of inputs) {
    let input = form.querySelector<HTMLInputElement>(`#${id}`);
    if (!input) {
      input = document.createElement('input');
      input.id = id;
      form.appendChild(input);
    }
    input.value = value;
  }
}

describe('EditorModalBereitschaftsZeit', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    getBereitschaftsZeitraumDatenMock.mockReturnValue([]);
    getInstanceMock.mockReturnValue({ hide: hideMock });
    storageGetMock.mockImplementation((key: string) => (key === 'Jahr' ? 2025 : 6));
  });

  describe('Formularaufbau', () => {
    it('zeigt vorbefüllte Felder beim Bearbeiten einer bestehenden Zeile (Row)', () => {
      const table = makeTable([
        { _id: 'bz1', Beginn: '2025-06-10T08:00:00.000Z', Ende: '2025-06-10T16:00:00.000Z', Pause: 30 } as IDatenBZ,
      ]);
      const row = table.rows.array[0];
      setupShowModalMock();

      EditorModalBereitschaftsZeit(row, 'Zeitraum bearbeiten');
      const container = renderCapturedVnode();

      const beginnInput = container.querySelector('#Beginn') as HTMLInputElement;
      expect(beginnInput.type).toBe('datetime-local');
      expect(beginnInput.value).toBe('2025-06-10T10:00');
      const pauseInput = container.querySelector('#Pause') as HTMLInputElement;
      expect(pauseInput.value).toBe('30');
    });

    it('zeigt leere Felder mit Metadaten beim Hinzufügen (CustomTable)', () => {
      const table = makeTable([]);
      setupShowModalMock();

      EditorModalBereitschaftsZeit(table, 'Zeitraum hinzufügen');
      const container = renderCapturedVnode();

      const beginnInput = container.querySelector('#Beginn') as HTMLInputElement;
      expect(beginnInput.type).toBe('datetime-local');
      expect(beginnInput.value).toBeFalsy();
      expect(beginnInput.name).toBe('Beginn der Bereitschaft');
    });

    it('setzt modal.row auf die übergebene Zeile bzw. Tabelle', () => {
      const table = makeTable([]);
      setupShowModalMock();

      EditorModalBereitschaftsZeit(table, 'Titel');

      const modal = showModalMock.mock.results[0].value as { row: unknown };
      expect(modal.row).toBe(table);
    });
  });

  describe('onSubmit', () => {
    it('speichert eine bearbeitete Zeile per row.val() und schließt das Modal', () => {
      const table = makeTable([
        { _id: 'bz1', Beginn: '2025-06-10T08:00:00.000Z', Ende: '2025-06-10T16:00:00.000Z', Pause: 30 } as IDatenBZ,
      ]);
      const row = table.rows.array[0];
      setupShowModalMock();
      EditorModalBereitschaftsZeit(row, 'Bearbeiten');
      const form = getForm();
      setFormValues(form, '2025-06-11T08:00', '2025-06-11T16:00', '15');

      getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

      expect(row.cells.Pause).toBe(15);
      expect(hideMock).toHaveBeenCalledTimes(1);
      expect(persistBereitschaftsZeitraumTableDataMock).toHaveBeenCalledWith(table);
    });

    it('fügt eine neue Zeile per rows.add() hinzu, wenn von der CustomTable aus aufgerufen', () => {
      const table = makeTable([]);
      setupShowModalMock();
      EditorModalBereitschaftsZeit(table, 'Hinzufügen');
      const form = getForm();
      setFormValues(form, '2025-06-11T08:00', '2025-06-11T16:00', '15');

      getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

      expect(table.rows.array.length).toBe(1);
      expect(hideMock).toHaveBeenCalledTimes(1);
    });

    it('bricht ab und zeigt eine Warnung, wenn Ende nicht nach Beginn liegt', () => {
      const table = makeTable([]);
      setupShowModalMock();
      EditorModalBereitschaftsZeit(table, 'Hinzufügen');
      const form = getForm();
      setFormValues(form, '2025-06-11T16:00', '2025-06-11T08:00', '15');

      getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

      expect(createSnackBarMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Ende muss nach Beginn liegen') }),
      );
      expect(table.rows.array.length).toBe(0);
      expect(hideMock).not.toHaveBeenCalled();
    });

    it('bricht ab und zeigt eine Warnung bei Überschneidung mit einem bestehenden Zeitraum', () => {
      getBereitschaftsZeitraumDatenMock.mockReturnValue([
        { _id: 'existing', Beginn: '2025-06-11T06:00:00.000Z', Ende: '2025-06-11T10:00:00.000Z', Pause: 0 },
      ]);
      const table = makeTable([]);
      setupShowModalMock();
      EditorModalBereitschaftsZeit(table, 'Hinzufügen');
      const form = getForm();
      setFormValues(form, '2025-06-11T08:00', '2025-06-11T16:00', '15');

      getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

      expect(createSnackBarMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('dürfen sich nicht überschneiden') }),
      );
      expect(table.rows.array.length).toBe(0);
    });

    it('ignoriert die eigene Zeile bei der Überschneidungsprüfung (Bearbeiten ohne Zeitänderung)', () => {
      const existing = { _id: 'bz1', Beginn: '2025-06-10T08:00:00.000Z', Ende: '2025-06-10T16:00:00.000Z', Pause: 30 };
      getBereitschaftsZeitraumDatenMock.mockReturnValue([existing]);
      const table = makeTable([existing as IDatenBZ]);
      const row = table.rows.array[0];
      setupShowModalMock();
      EditorModalBereitschaftsZeit(row, 'Bearbeiten');
      const form = getForm();
      setFormValues(form, '2025-06-10T08:00', '2025-06-10T16:00', '45');

      getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

      expect(createSnackBarMock).not.toHaveBeenCalled();
      expect(hideMock).toHaveBeenCalledTimes(1);
    });

    it('bricht ohne Aktion ab, wenn das Formular ungültig ist', () => {
      const table = makeTable([]);
      showModalMock.mockImplementation((vnode: { props: { myRef: { current: HTMLFormElement | null } } }) => {
        const form = document.createElement('form');
        form.checkValidity = () => false;
        vnode.props.myRef.current = form;
        return document.createElement('div');
      });
      EditorModalBereitschaftsZeit(table, 'Hinzufügen');

      const preventDefault = vi.fn();
      getSubmit()({ preventDefault } as unknown as Event);

      expect(preventDefault).not.toHaveBeenCalled();
      expect(persistBereitschaftsZeitraumTableDataMock).not.toHaveBeenCalled();
    });
  });
});
