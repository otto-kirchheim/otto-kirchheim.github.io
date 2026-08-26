import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { h, render, type ComponentChildren } from 'preact';

const { showModalMock, submitBereitschaftsEinsatzMock, storageGetMock, hideMock, getInstanceMock } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  showModalMock: vi.fn(),
  submitBereitschaftsEinsatzMock: vi.fn(),
  storageGetMock: vi.fn(),
  hideMock: vi.fn(),
  getInstanceMock: vi.fn(),
}));

type InputProps = { id: string; name?: string; type?: string; min?: string; max?: string; value?: string };
type SelectProps = { id: string; options: Array<{ value?: string; text: string }> };

vi.mock('@/components', () => ({
  showModal: showModalMock,
  MyFormModal: (props: { children?: ComponentChildren }) => h('div', { class: 'modal-stub' }, props.children),
  MyModalBody: (props: { children?: ComponentChildren }) => h('div', { class: 'modal-body-stub' }, props.children),
  MyInput: (props: InputProps) =>
    h('input', { id: props.id, name: props.name, type: props.type, min: props.min, max: props.max, value: props.value }),
  MySelect: (props: SelectProps) =>
    h(
      'select',
      { id: props.id },
      props.options.map(o => h('option', { value: o.value }, o.text)),
    ),
  MyCheckbox: (props: { id: string; children?: ComponentChildren }) => h('input', { type: 'checkbox', id: props.id }),
}));

vi.mock('@/infrastructure/storage/Storage', () => ({
  default: { get: storageGetMock },
}));

vi.mock('@/features/Bereitschaft/utils', () => ({
  submitBereitschaftsEinsatz: submitBereitschaftsEinsatzMock,
}));

vi.mock('bootstrap/js/dist/modal', () => ({
  default: { getInstance: getInstanceMock },
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
    getInstanceMock.mockReturnValue({ hide: hideMock });
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
