import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { h, render, type ComponentChildren } from 'preact';
import type { Row } from '@/infrastructure/table/CustomTable';
import type { IVorgabenUvorgabenB } from '@/types';

const { showModalMock } = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  showModalMock: vi.fn(),
}));

type StubProps = { children?: ComponentChildren; Footer?: ComponentChildren };

vi.mock('@/components', () => ({
  showModal: showModalMock,
  MyDivModal: (props: StubProps) => h('div', { class: 'modal-stub' }, [props.Footer, props.children]),
  MyModalBody: (props: StubProps) => h('div', { class: 'modal-body-stub' }, props.children),
  MyShowElement: (props: { id: string; title: string; text: string }) =>
    h('div', { class: 'show-element', 'data-id': props.id }, [
      h('span', { class: 'label' }, props.title),
      h('span', { class: 'value' }, props.text),
    ]),
  MyShowFooter: () => h('div', { class: 'show-footer' }),
}));

import ShowModalVE from '@/features/Einstellungen/components/createShowModalVE';

function fakeColumn(name: string, title: string, parser: (value: unknown, option?: unknown) => string) {
  return { name, title, parser };
}

function fakeRow(cells: Record<string, unknown>): Row<IVorgabenUvorgabenB> {
  const identityParser = (value: unknown) => String(value);
  return {
    cells: cells as unknown as IVorgabenUvorgabenB,
    columns: {
      array: [
        fakeColumn('Name', 'Name', identityParser),
        fakeColumn('standard', 'Standard', v => (v ? 'Ja' : 'Nein')),
        fakeColumn('beginnB', 'Ber Von', identityParser),
        fakeColumn('endeB', 'Ber Bis', identityParser),
        fakeColumn('nacht', 'Nacht?', v => (v ? 'Ja' : 'Nein')),
        fakeColumn('beginnN', 'Nacht Von', identityParser),
        fakeColumn('endeN', 'Nacht Bis', identityParser),
      ],
    },
  } as unknown as Row<IVorgabenUvorgabenB>;
}

function renderCapturedVnode(): HTMLDivElement {
  const container = document.createElement('div');
  const vnode = showModalMock.mock.calls[0][0];
  render(vnode, container);
  return container;
}

describe('ShowModalVE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    showModalMock.mockReturnValue({});
  });

  it('zeigt den Nachtschicht-Block mit Zeiten, wenn nacht=true', () => {
    const row = fakeRow({
      Name: 'Standard',
      standard: true,
      beginnB: 'Mo 06:00',
      endeB: 'Mo 14:00',
      nacht: true,
      beginnN: 'Mo 22:00',
      endeN: 'Di 06:00',
    });

    ShowModalVE(row, 'Voreinstellung anzeigen');
    const container = renderCapturedVnode();

    expect(container.querySelector('[data-id="beginnN"] .value')?.textContent).toBe('Mo 22:00');
    expect(container.querySelector('[data-id="endeN"] .value')?.textContent).toBe('Di 06:00');
    expect(container.textContent).not.toContain('Keine Nachtschicht aktiviert');
  });

  it('zeigt den Hinweis "Keine Nachtschicht aktiviert", wenn nacht=false', () => {
    const row = fakeRow({ Name: 'Standard', standard: false, beginnB: 'Mo 06:00', endeB: 'Mo 14:00', nacht: false });

    ShowModalVE(row, 'Voreinstellung anzeigen');
    const container = renderCapturedVnode();

    expect(container.textContent).toContain('Keine Nachtschicht aktiviert');
    expect(container.querySelector('[data-id="beginnN"]')).toBeNull();
  });

  it('setzt modal.row auf die übergebene Zeile', () => {
    const row = fakeRow({ Name: 'X', standard: false, nacht: false });
    const fakeModal: { row?: unknown } = {};
    showModalMock.mockReturnValue(fakeModal);

    ShowModalVE(row, 'Titel');

    expect(fakeModal.row).toBe(row);
  });

  it('wirft, wenn eine referenzierte Spalte nicht existiert', () => {
    const row = { cells: {}, columns: { array: [] } } as unknown as Row<IVorgabenUvorgabenB>;

    expect(() => ShowModalVE(row, 'Titel')).toThrow('Spalte Name nicht gefunden');
  });
});
