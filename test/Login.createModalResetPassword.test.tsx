import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { h } from 'preact';

const { showModalMock, createSnackBarMock, resetPasswordMock, hideMock, getInstanceMock } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  showModalMock: vi.fn(),
  createSnackBarMock: vi.fn(),
  resetPasswordMock: vi.fn(),
  hideMock: vi.fn(),
  getInstanceMock: vi.fn(),
}));

vi.mock('../src/ts/components', () => ({
  showModal: showModalMock,
  MyFormModal: (props: Record<string, unknown>) => h('div', props),
  MyModalBody: (props: Record<string, unknown>) => h('div', props),
  MyInput: (props: Record<string, unknown>) => h('input', props),
}));

vi.mock('../src/ts/class/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

vi.mock('../src/ts/infrastructure/api/apiService', () => ({
  authApi: {
    resetPassword: resetPasswordMock,
  },
}));

vi.mock('bootstrap/js/dist/modal', () => ({
  default: {
    getInstance: getInstanceMock,
  },
}));

import createModalResetPassword from '../src/ts/features/Login/components/createModalResetPassword';

function setupShowModalMock(password = 'pass12345', repeat = 'pass12345', isValid = true) {
  showModalMock.mockImplementation((vnode: { props: { myRef: { current: HTMLFormElement | null } } }) => {
    const form = document.createElement('form');
    form.checkValidity = () => isValid;
    vnode.props.myRef.current = form;

    const modal = document.createElement('div');

    const pass1 = document.createElement('input');
    pass1.id = 'PasswortNeuReset';
    pass1.value = password;

    const pass2 = document.createElement('input');
    pass2.id = 'PasswortNeuReset2';
    pass2.value = repeat;

    modal.appendChild(pass1);
    modal.appendChild(pass2);
    document.body.appendChild(modal);
    return modal;
  });
}

describe('createModalResetPassword', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="errorMessage"></div>';
    vi.clearAllMocks();
    setupShowModalMock();
    getInstanceMock.mockReturnValue({ hide: hideMock });
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  it('setzt Passwort erfolgreich zurueck und zeigt Erfolg', async () => {
    resetPasswordMock.mockResolvedValue(undefined);

    createModalResetPassword('token-123');

    const submit = showModalMock.mock.calls[0][0].props.onSubmit as (event: Event) => Promise<void>;
    const preventDefault = vi.fn();
    await submit({ preventDefault } as unknown as Event);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(resetPasswordMock).toHaveBeenCalledWith('token-123', 'pass12345');
    expect(hideMock).toHaveBeenCalledTimes(1);
    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
  });

  it('zeigt Fehler bei ungleichen Passwoertern', async () => {
    setupShowModalMock('pass12345', 'anderes');

    createModalResetPassword('token-123');

    const submit = showModalMock.mock.calls[0][0].props.onSubmit as (event: Event) => Promise<void>;
    await submit({ preventDefault: vi.fn() } as unknown as Event);

    expect(resetPasswordMock).not.toHaveBeenCalled();
    expect(document.querySelector<HTMLDivElement>('#errorMessage')?.textContent).toBe(
      'Passwörter stimmen nicht überein',
    );
  });

  it('zeigt Fehler bei zu kurzem neuem Passwort', async () => {
    setupShowModalMock('kurz', 'kurz');

    createModalResetPassword('token-123');

    const submit = showModalMock.mock.calls[0][0].props.onSubmit as (event: Event) => Promise<void>;
    await submit({ preventDefault: vi.fn() } as unknown as Event);

    expect(resetPasswordMock).not.toHaveBeenCalled();
    expect(document.querySelector<HTMLDivElement>('#errorMessage')?.textContent).toBe(
      'Das neue Passwort muss mindestens 8 Zeichen lang sein',
    );
  });

  it('markiert das Formular für Bootstrap-Validierung bei ungültigen Eingaben', async () => {
    setupShowModalMock('pass12345', 'pass12345', false);

    createModalResetPassword('token-123');

    const submit = showModalMock.mock.calls[0][0].props.onSubmit as (event: Event) => Promise<void>;
    const preventDefault = vi.fn();
    await submit({ preventDefault } as unknown as Event);

    const form = showModalMock.mock.calls[0][0].props.myRef.current as HTMLFormElement;
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(form.classList.contains('was-validated')).toBe(true);
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  it('zeigt Offline-Fehler ohne API-Call', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });

    createModalResetPassword('token-123');

    const submit = showModalMock.mock.calls[0][0].props.onSubmit as (event: Event) => Promise<void>;
    await submit({ preventDefault: vi.fn() } as unknown as Event);

    expect(resetPasswordMock).not.toHaveBeenCalled();
    expect(document.querySelector<HTMLDivElement>('#errorMessage')?.textContent).toBe('Keine Internetverbindung');
  });
});
