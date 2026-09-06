import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { createElement as h, type ReactNode } from 'react';
import { render } from '../../reactRender';

const {
  showModalMock,
  submitBereitschaftsEinsatzMock,
  getBereitschaftsZeitraumDatenMock,
  onEventMock,
  storageGetMock,
  hideMock,
} = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  showModalMock: vi.fn(),
  submitBereitschaftsEinsatzMock: vi.fn(),
  getBereitschaftsZeitraumDatenMock: vi.fn(),
  onEventMock: vi.fn(),
  storageGetMock: vi.fn(),
  hideMock: vi.fn(),
}));

type InputProps = { id: string; name?: string; type?: string; min?: string; max?: string; value?: string };
type SelectProps = { id: string; options: Array<{ value?: string; text: string }> };

vi.mock('@/components', () => ({
  schliesseModal: hideMock,
  showModal: showModalMock,
  MyFormModal: (props: { children?: ReactNode }) => h('div', { className: 'modal-stub' }, props.children),
  MyModalBody: (props: { children?: ReactNode }) => h('div', { className: 'modal-body-stub' }, props.children),
  MyInput: (props: InputProps) =>
    h('input', {
      id: props.id,
      name: props.name,
      type: props.type,
      min: props.min,
      max: props.max,
      defaultValue: props.value,
    }),
  MySelect: (props: SelectProps) =>
    h(
      'select',
      { id: props.id },
      props.options.map(o => h('option', { key: o.text, value: o.value }, o.text)),
    ),
  MyCheckbox: (props: { id: string; children?: ReactNode }) => h('input', { type: 'checkbox', id: props.id }),
}));

vi.mock('@/infrastructure/storage/Storage', () => ({
  default: { get: storageGetMock },
}));

vi.mock('@/features/Bereitschaft/utils', () => ({
  submitBereitschaftsEinsatz: submitBereitschaftsEinsatzMock,
  getBereitschaftsZeitraumDaten: getBereitschaftsZeitraumDatenMock,
  isBzUnsynced: (bz: { _id?: string; __localState?: string }) => !bz._id || bz.__localState === 'modified',
}));

vi.mock('@/core', () => ({
  onEvent: onEventMock,
}));

import createAddModalBereitschaftsEinsatz from '@/features/Bereitschaft/components/createAddModalBereitschaftsEinsatz';

function makeColumnTable(id: string, columns: Array<{ name: string; type?: string; longTitle?: string }>): void {
  const table = document.createElement('table');
  table.id = id;
  (table as unknown as { instance: unknown }).instance = { columns: { array: columns } };
  document.body.appendChild(table);
}

function setupShowModalMock(checkValidity = true): void {
  showModalMock.mockImplementation((vnode: { props: { myRef: { current: HTMLFormElement | null } } }) => {
    const form = document.createElement('form');
    form.checkValidity = () => checkValidity;
    vnode.props.myRef.current = form;
    return document.createElement('div');
  });
}

function getSubmit(): (event: Event) => Promise<void> {
  return showModalMock.mock.calls[0][0].props.onSubmit as (event: Event) => Promise<void>;
}

function renderCapturedVnode(): HTMLDivElement {
  const container = document.createElement('div');
  render(showModalMock.mock.calls[0][0], container);
  return container;
}

describe('createAddModalBereitschaftsEinsatz', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    storageGetMock.mockImplementation((key: string) => (key === 'Jahr' ? 2025 : 4));
    getBereitschaftsZeitraumDatenMock.mockReturnValue([]);
    onEventMock.mockReturnValue(vi.fn());
  });

  it('wirft, wenn #tableBE nicht existiert', () => {
    expect(() => createAddModalBereitschaftsEinsatz()).toThrow('Tabelle nicht gefunden');
  });

  it('wirft, wenn #tableBZ nicht existiert', () => {
    makeColumnTable('tableBE', []);
    expect(() => createAddModalBereitschaftsEinsatz()).toThrow('tableBZ nicht gefunden');
  });

  it('nutzt Spalten-Metadaten (type/longTitle) für das Datumsfeld', () => {
    makeColumnTable('tableBE', [{ name: 'Tag', type: 'date', longTitle: 'Einsatztag' }]);
    makeColumnTable('tableBZ', []);
    setupShowModalMock();

    createAddModalBereitschaftsEinsatz();
    const container = renderCapturedVnode();

    const datumInput = container.querySelector('#Datum') as HTMLInputElement;
    expect(datumInput.type).toBe('date');
    expect(datumInput.name).toBe('Einsatztag');
  });

  it('fällt auf Standardwerte zurück, wenn eine Spalte fehlt', () => {
    makeColumnTable('tableBE', []);
    makeColumnTable('tableBZ', []);
    setupShowModalMock();

    createAddModalBereitschaftsEinsatz();
    const container = renderCapturedVnode();

    const sapInput = container.querySelector('#SAPNR') as HTMLInputElement;
    expect(sapInput.type).toBe('text');
    expect(sapInput.name).toBe('SAP-Nr / Einsatzbeschreibung');
  });

  it('ruft submitBereitschaftsEinsatz auf und schließt das Modal bei Erfolg', async () => {
    makeColumnTable('tableBE', []);
    makeColumnTable('tableBZ', []);
    setupShowModalMock(true);
    submitBereitschaftsEinsatzMock.mockResolvedValue(true);

    createAddModalBereitschaftsEinsatz();
    const preventDefault = vi.fn();
    await getSubmit()({ preventDefault } as unknown as Event);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(submitBereitschaftsEinsatzMock).toHaveBeenCalledTimes(1);
    expect(hideMock).toHaveBeenCalledTimes(1);
  });

  it('lässt das Modal offen, wenn submitBereitschaftsEinsatz false liefert', async () => {
    makeColumnTable('tableBE', []);
    makeColumnTable('tableBZ', []);
    setupShowModalMock(true);
    submitBereitschaftsEinsatzMock.mockResolvedValue(false);

    createAddModalBereitschaftsEinsatz();
    await getSubmit()({ preventDefault: vi.fn() } as unknown as Event);

    expect(hideMock).not.toHaveBeenCalled();
  });

  it('zeigt Hinweis wenn ein Bereitschaftszeitraum noch nicht gespeichert ist, und blendet ihn nach Sync wieder aus', () => {
    makeColumnTable('tableBE', []);
    makeColumnTable('tableBZ', []);
    setupShowModalMock();
    getBereitschaftsZeitraumDatenMock.mockReturnValue([
      { Beginn: '2025-04-01T07:00:00.000Z', Ende: '2025-04-01T23:00:00.000Z', Pause: 0 },
    ]);

    createAddModalBereitschaftsEinsatz();
    const container = renderCapturedVnode();
    const hint = Array.from(container.querySelectorAll('p')).find(p => p.textContent?.includes('Achtung'));
    expect(hint).toBeDefined();
    expect(hint!.style.display).not.toBe('none');

    getBereitschaftsZeitraumDatenMock.mockReturnValue([
      { _id: 'bz1', Beginn: '2025-04-01T07:00:00.000Z', Ende: '2025-04-01T23:00:00.000Z', Pause: 0 },
    ]);
    const dataChangedListener = onEventMock.mock.calls[0][1] as (payload: { resource: string }) => void;
    dataChangedListener({ resource: 'BZ' });

    expect(hint!.style.display).toBe('none');
  });

  it('bricht ab, wenn das Formular ungültig ist', async () => {
    makeColumnTable('tableBE', []);
    makeColumnTable('tableBZ', []);
    setupShowModalMock(false);

    createAddModalBereitschaftsEinsatz();
    const preventDefault = vi.fn();
    await getSubmit()({ preventDefault } as unknown as Event);

    expect(preventDefault).not.toHaveBeenCalled();
    expect(submitBereitschaftsEinsatzMock).not.toHaveBeenCalled();
  });
});
