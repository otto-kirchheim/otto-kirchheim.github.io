import { beforeEach, describe, expect, it, vi } from 'bun:test';
import { h } from 'preact';

const { showModalMock, createSnackBarMock, forgotPasswordMock, hideMock, getInstanceMock } = (
  vi as typeof vi & { hoisted: <T>(factory: () => T) => T }
).hoisted(() => ({
  showModalMock: vi.fn(),
  createSnackBarMock: vi.fn(),
  forgotPasswordMock: vi.fn(),
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
    forgotPassword: forgotPasswordMock,
  },
}));

vi.mock('bootstrap/js/dist/modal', () => ({
  default: {
    getInstance: getInstanceMock,
  },
}));

import createModalForgotPassword from '../src/ts/features/Login/components/createModalForgotPassword';

function setupShowModalMock() {
  showModalMock.mockImplementation((vnode: { props: { myRef: { current: HTMLFormElement | null } } }) => {
    const form = document.createElement('form');
    form.checkValidity = () => true;
    vnode.props.myRef.current = form;

    const modal = document.createElement('div');
    const input = document.createElement('input');
    input.id = 'EmailReset';
    input.value = '  user@deutschebahn.com  ';
    modal.appendChild(input);

    document.body.appendChild(modal);
    return modal;
  });
}

describe('createModalForgotPassword', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="errorMessage"></div>';
    vi.clearAllMocks();
    setupShowModalMock();
    getInstanceMock.mockReturnValue({ hide: hideMock });
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  it('sendet forgot-password Request und zeigt Erfolg', async () => {
    forgotPasswordMock.mockResolvedValue(undefined);

    createModalForgotPassword();

    const submit = showModalMock.mock.calls[0][0].props.onSubmit as (event: Event) => Promise<void>;
    const preventDefault = vi.fn();
    await submit({ preventDefault } as unknown as Event);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(forgotPasswordMock).toHaveBeenCalledWith('user@deutschebahn.com');
    expect(getInstanceMock).toHaveBeenCalled();
    expect(hideMock).toHaveBeenCalledTimes(1);
    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
  });

  it('zeigt Offline-Fehler und ruft API nicht auf', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });

    createModalForgotPassword();

    const submit = showModalMock.mock.calls[0][0].props.onSubmit as (event: Event) => Promise<void>;
    await submit({ preventDefault: vi.fn() } as unknown as Event);

    expect(forgotPasswordMock).not.toHaveBeenCalled();
    expect(document.querySelector<HTMLDivElement>('#errorMessage')?.textContent).toBe('Keine Internetverbindung');
  });

  it('zeigt API-Fehler im errorMessage Feld', async () => {
    forgotPasswordMock.mockRejectedValue(new Error('kaputt'));

    createModalForgotPassword();

    const submit = showModalMock.mock.calls[0][0].props.onSubmit as (event: Event) => Promise<void>;
    await submit({ preventDefault: vi.fn() } as unknown as Event);

    expect(document.querySelector<HTMLDivElement>('#errorMessage')?.innerHTML).toBe('kaputt');
    expect(createSnackBarMock).not.toHaveBeenCalled();
  });
});
