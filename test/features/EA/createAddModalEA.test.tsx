import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { h, render, type ComponentChildren } from 'preact';
import { createCustomTable, type CustomTable } from '@/infrastructure/table/CustomTable';
import type { IDatenEA, IVorgabenU } from '@/types';

const {
  showModalMock,
  createSnackBarMock,
  storageGetMock,
  onEventMock,
  getEwtDatenMock,
  applySelectOptionsMock,
  addEaTagMock,
  calculateEaDauerFromEwtMock,
} = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  showModalMock: vi.fn(),
  createSnackBarMock: vi.fn(),
  storageGetMock: vi.fn(),
  onEventMock: vi.fn(),
  getEwtDatenMock: vi.fn(),
  applySelectOptionsMock: vi.fn(),
  addEaTagMock: vi.fn(),
  calculateEaDauerFromEwtMock: vi.fn(),
}));

vi.mock('@/components', () => ({
  showModal: showModalMock,
  // Echtes <form ref={...}> statt Stub-Div: der SUT liest Felder ueber `ref.current.querySelector(...)`,
  // die Kinder muessen also tatsaechlich im per Ref referenzierten Element landen.
  MyFormModal: (props: { myRef?: unknown; children?: ComponentChildren }) =>
    h('form', { ref: props.myRef }, props.children),
  MyModalBody: (props: { children?: ComponentChildren }) => h('div', {}, props.children),
  MyInput: (props: { id: string; [key: string]: unknown }) => h('input', props),
  MySelect: (props: {
    id: string;
    changeHandler?: (e: Event) => void;
    options: Array<{ value?: string; text: string; selected?: boolean; disabled?: boolean }>;
  }) =>
    h(
      'select',
      { id: props.id, onChange: props.changeHandler },
      props.options.map(o => h('option', { value: o.value, selected: o.selected, disabled: o.disabled }, o.text)),
    ),
}));

vi.mock('@/infrastructure/ui/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

vi.mock('@/infrastructure/storage/Storage', () => ({
  default: { get: storageGetMock },
}));

vi.mock('@/core', () => ({
  onEvent: onEventMock,
}));

vi.mock('@/features/EWT/utils', () => ({
  getEwtDaten: getEwtDatenMock,
}));

vi.mock('@/features/Neben/utils/applySelectOptions', () => ({
  default: applySelectOptionsMock,
}));

vi.mock('@/features/EA/utils', () => ({
  addEaTag: addEaTagMock,
  calculateEaDauerFromEwt: calculateEaDauerFromEwtMock,
}));

const { default: createAddModalEA, suggestNextEntgeltgruppe } =
  await import('@/features/EA/components/createAddModalEA');

const VORGABEN_U = { Pers: { Entgeltgruppe: '9' } } as unknown as IVorgabenU;

let tableCounter = 0;
function makeTableEA(rows: IDatenEA[] = []): CustomTable<IDatenEA> {
  const table = document.createElement('table');
  table.id = `tableEA${tableCounter++}`;
  document.body.appendChild(table);
  return createCustomTable<IDatenEA>(table.id, {
    columns: [
      { name: 'Tag', title: 'Tag' },
      { name: 'Dauer', title: 'Dauer' },
      { name: 'Taetigkeit', title: 'Tätigkeit' },
      { name: 'Entgeltgruppe', title: 'Entgeltgruppe' },
      { name: 'EWT', title: 'EWT' },
    ],
    rows,
  });
}

function ewtDay(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'ewt-1',
    Tag: '2025-06-10T00:00:00.000Z',
    Schicht: 'T',
    __localState: undefined,
    ...overrides,
  };
}

function setupShowModalMock(): void {
  showModalMock.mockImplementation(vnode => {
    const modal = document.createElement('div');
    document.body.appendChild(modal);
    render(vnode as never, modal);
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

describe('createAddModalEA', () => {
  describe('suggestNextEntgeltgruppe', () => {
    it('zieht 1 von einer numerischen Entgeltgruppe ab', () => {
      expect(suggestNextEntgeltgruppe({ Pers: { Entgeltgruppe: '9' } } as unknown as IVorgabenU)).toBe('8');
    });

    it('liefert "" ohne gesetzte Entgeltgruppe', () => {
      expect(suggestNextEntgeltgruppe({ Pers: {} } as unknown as IVorgabenU)).toBe('');
    });

    it('liefert "" bei nicht-numerischer Entgeltgruppe', () => {
      expect(suggestNextEntgeltgruppe({ Pers: { Entgeltgruppe: 'A9' } } as unknown as IVorgabenU)).toBe('');
    });
  });

  describe('Modal', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
      vi.clearAllMocks();
      setupShowModalMock();
      storageGetMock.mockImplementation((key: string) => {
        if (key === 'VorgabenU') return VORGABEN_U;
        if (key === 'Jahr') return 2025;
        if (key === 'Monat') return 6;
        return undefined;
      });
      onEventMock.mockReturnValue(vi.fn());
      calculateEaDauerFromEwtMock.mockReturnValue('08:00');
    });

    it('zeigt kein EWT-Auswahlfeld, wenn keine EWT-Einträge im Monat existieren', () => {
      getEwtDatenMock.mockReturnValue([]);
      const table = makeTableEA([]);

      createAddModalEA(table);
      const container = document.createElement('div');
      document.body.appendChild(container);
      render(showModalMock.mock.calls[0][0], container);

      expect(container.querySelector('#ewtRefSelect')).toBeNull();
    });

    it('wählt beim Öffnen den nächsten freien EWT-Eintrag vor und füllt Tag/Dauer', () => {
      getEwtDatenMock.mockReturnValue([ewtDay()]);
      const table = makeTableEA([]);

      createAddModalEA(table);
      const form = getForm();

      const tagInput = form.querySelector<HTMLInputElement>('#Tag');
      const dauerInput = form.querySelector<HTMLInputElement>('#Dauer');
      expect(tagInput?.disabled).toBe(true);
      expect(dauerInput?.disabled).toBe(true);
      expect(dauerInput?.value).toBe('08:00');
    });

    it('lässt Tag/Dauer bearbeitbar, wenn bereits alle EWT-Einträge verknüpft sind', () => {
      getEwtDatenMock.mockReturnValue([ewtDay({ _id: 'ewt-used' })]);
      const table = makeTableEA([{ EWT: 'ewt-used' } as unknown as IDatenEA]);

      createAddModalEA(table);
      const form = getForm();

      expect(form.querySelector<HTMLInputElement>('#Tag')?.disabled).toBe(false);
    });

    it('reagiert nicht auf data:changed für andere Ressourcen', () => {
      getEwtDatenMock.mockReturnValue([ewtDay()]);
      makeTableEA([]);
      createAddModalEA(makeTableEA([]));

      const handler = onEventMock.mock.calls[0][1] as (payload: { resource: string }) => void;
      applySelectOptionsMock.mockClear();
      handler({ resource: 'BZ' });

      expect(applySelectOptionsMock).not.toHaveBeenCalled();
    });

    it('synchronisiert die EWT-Auswahl bei data:changed für EWT', () => {
      getEwtDatenMock.mockReturnValue([ewtDay()]);
      const table = makeTableEA([]);
      createAddModalEA(table);

      const handler = onEventMock.mock.calls[0][1] as (payload: { resource: string }) => void;
      handler({ resource: 'EWT' });

      expect(applySelectOptionsMock).toHaveBeenCalled();
    });

    it('bricht onSubmit ab, wenn das Formular ungültig ist', () => {
      getEwtDatenMock.mockReturnValue([]);
      const table = makeTableEA([]);
      createAddModalEA(table);
      getForm().checkValidity = () => false;

      const preventDefault = vi.fn();
      getSubmit()({ preventDefault } as unknown as Event);

      expect(preventDefault).not.toHaveBeenCalled();
      expect(addEaTagMock).not.toHaveBeenCalled();
    });

    it('ruft addEaTag auf und zeigt einen Hinweis, wenn kein weiterer freier Tag existiert', () => {
      getEwtDatenMock.mockReturnValue([]);
      storageGetMock.mockImplementation((key: string) => (key === 'Jahr' ? 2025 : key === 'Monat' ? 1 : VORGABEN_U));
      const table = makeTableEA([]);
      createAddModalEA(table);
      getForm().checkValidity = () => true;
      addEaTagMock.mockReturnValue(true);
      // Ganzer Monat bereits belegt: 31 Tage im Januar.
      const filledDays = Array.from({ length: 31 }, (_, i) => ({
        Tag: `${String(i + 1).padStart(2, '0')}.01.2025`,
      })) as unknown as IDatenEA[];
      filledDays.forEach(d => table.rows.add(d));

      getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

      expect(addEaTagMock).toHaveBeenCalledWith(expect.anything(), table);
      expect(createSnackBarMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('existiert bereits ein Eintrag') }),
      );
    });

    it('springt nach dem Speichern nicht weiter, wenn addEaTag false liefert', () => {
      getEwtDatenMock.mockReturnValue([]);
      const table = makeTableEA([]);
      createAddModalEA(table);
      getForm().checkValidity = () => true;
      addEaTagMock.mockReturnValue(false);

      getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

      expect(createSnackBarMock).not.toHaveBeenCalled();
    });
  });
});
