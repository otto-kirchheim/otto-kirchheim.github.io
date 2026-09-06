import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { createElement as h, type ReactNode } from 'react';
import { render } from '../../reactRender';

import type { Column, Row, CustomTableTypes } from '@/infrastructure/table/CustomTable';

const { showModalMock } = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  showModalMock: vi.fn(),
}));

type StubProps = { children?: ReactNode; Footer?: ReactNode; errorMessage?: string };

vi.mock('@/components', () => ({
  showModal: showModalMock,
  MyDivModal: (props: StubProps) =>
    h(
      'div',
      { className: 'modal-stub' },
      props.errorMessage ? h('div', { className: 'error' }, props.errorMessage) : null,
      props.Footer,
      props.children,
    ),
  MyModalBody: (props: StubProps) => h('div', { className: 'modal-body-stub' }, props.children),
  MyShowFooter: () => h('div', { className: 'show-footer' }),
}));

import ShowModalBereitschaft from '@/features/Bereitschaft/components/createShowModalBereitschaft';

function fakeColumn(name: string, title: string, editing = false): Column<CustomTableTypes> {
  return {
    name,
    title,
    editing,
    parser: (value: unknown) => String(value),
  } as unknown as Column<CustomTableTypes>;
}

function fakeRow(
  cells: Record<string, unknown>,
  columns: Column<CustomTableTypes>[],
  overrides: Partial<Row<CustomTableTypes>> = {},
): Row<CustomTableTypes> {
  return {
    cells: cells as unknown as CustomTableTypes,
    columns: { array: columns },
    isError: false,
    ...overrides,
  } as unknown as Row<CustomTableTypes>;
}

function renderCapturedVnode(): HTMLDivElement {
  const container = document.createElement('div');
  render(showModalMock.mock.calls[0][0], container);
  return container;
}

describe('ShowModalBereitschaft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    showModalMock.mockReturnValue({});
  });

  it('rendert eine Zeile je Nicht-Editing-Spalte', () => {
    const columns = [fakeColumn('Beginn', 'Beginn'), fakeColumn('editingCol', '', true), fakeColumn('Ende', 'Ende')];
    const row = fakeRow({ Beginn: '08:00', Ende: '16:00' }, columns);

    ShowModalBereitschaft(row, 'Details');
    const container = renderCapturedVnode();

    expect(container.querySelectorAll('.raster').length).toBe(2);
    expect(container.querySelector('#Beginn')?.textContent).toBe('08:00');
    expect(container.querySelector('#Ende')?.textContent).toBe('16:00');
  });

  it('setzt modal.row auf die übergebene Zeile', () => {
    const fakeModal: { row?: unknown } = {};
    showModalMock.mockReturnValue(fakeModal);
    const row = fakeRow({}, []);

    ShowModalBereitschaft(row, 'Titel');

    expect(fakeModal.row).toBe(row);
  });

  it('zeigt eine Fehlermeldung, wenn die Zeile fehlerhaft ist', () => {
    const row = fakeRow({}, [], { isError: true, _errorMessage: 'Kaputte Zeile' });

    ShowModalBereitschaft(row, 'Titel');
    const container = renderCapturedVnode();

    expect(container.querySelector('.error')?.textContent).toBe('Kaputte Zeile');
  });

  it('zeigt keine Fehlermeldung, wenn die Zeile fehlerfrei ist', () => {
    const row = fakeRow({}, [], { isError: false });

    ShowModalBereitschaft(row, 'Titel');
    const container = renderCapturedVnode();

    expect(container.querySelector('.error')).toBeNull();
  });
});
