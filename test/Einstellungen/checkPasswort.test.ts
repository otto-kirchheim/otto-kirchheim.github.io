import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createSnackBarMock, changePasswordMock, setLoadingMock, clearLoadingMock, modalHideMock } = vi.hoisted(() => ({
  createSnackBarMock: vi.fn(),
  changePasswordMock: vi.fn(),
  setLoadingMock: vi.fn(),
  clearLoadingMock: vi.fn(),
  modalHideMock: vi.fn(),
}));

vi.mock('../../src/ts/class/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

vi.mock('../../src/ts/utilities/apiService', () => ({
  authApi: { changePassword: changePasswordMock },
}));

vi.mock('../../src/ts/utilities', () => ({
  setLoading: setLoadingMock,
  clearLoading: clearLoadingMock,
}));

vi.mock('bootstrap/js/dist/modal', () => ({
  default: { getInstance: () => ({ hide: modalHideMock }) },
}));

import checkPasswort from '../../src/ts/Einstellungen/utils/checkPasswort';
import type { CustomHTMLDivElement } from '../../src/ts/interfaces';

function createModal(alt: string, neu: string, neu2: string): CustomHTMLDivElement {
  const modal = document.createElement('div') as CustomHTMLDivElement;
  modal.innerHTML = `
    <div id="errorMessage"></div>
    <input id="PasswortAlt" value="${alt}" />
    <input id="PasswortNeu" value="${neu}" />
    <input id="PasswortNeu2" value="${neu2}" />
  `;
  return modal;
}

describe('checkPasswort', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  it('zeigt Fehler bei fehlendem altem Passwort', async () => {
    const modal = createModal('', 'neu123', 'neu123');
    await checkPasswort(modal);
    expect(modal.querySelector('#errorMessage')!.textContent).toBe('Bitte Aktuelles Passwort Eingeben');
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  it('zeigt Fehler bei fehlendem neuem Passwort', async () => {
    const modal = createModal('alt123', '', 'neu123');
    await checkPasswort(modal);
    expect(modal.querySelector('#errorMessage')!.textContent).toBe('Bitte Neues Passwort Eingeben');
  });

  it('zeigt Fehler bei fehlender Passwort-Wiederholung', async () => {
    const modal = createModal('alt123', 'neu123', '');
    await checkPasswort(modal);
    expect(modal.querySelector('#errorMessage')!.textContent).toBe('Bitte Neues Passwort wiederholen');
  });

  it('zeigt Fehler bei nicht übereinstimmenden Passwörtern', async () => {
    const modal = createModal('alt123', 'neu123', 'anders');
    await checkPasswort(modal);
    expect(modal.querySelector('#errorMessage')!.textContent).toBe('Passwort falsch wiederholt');
  });

  it('zeigt Fehler wenn alt == neu', async () => {
    const modal = createModal('gleich123', 'gleich123', 'gleich123');
    await checkPasswort(modal);
    expect(modal.querySelector('#errorMessage')!.textContent).toBe('Passwörter Alt und Neu sind gleich');
  });

  it('zeigt Fehler bei fehlender Internetverbindung', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const modal = createModal('alt123', 'neu123', 'neu123');
    await checkPasswort(modal);
    expect(modal.querySelector('#errorMessage')!.textContent).toBe('Keine Internetverbindung');
  });

  it('ruft API auf und schließt Modal bei Erfolg', async () => {
    changePasswordMock.mockResolvedValue(undefined);
    const modal = createModal('alt123', 'neu123', 'neu123');
    await checkPasswort(modal);

    expect(changePasswordMock).toHaveBeenCalledWith('alt123', 'neu123');
    expect(modalHideMock).toHaveBeenCalled();
    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'success' }));
    expect(setLoadingMock).toHaveBeenCalledWith('btnChange');
    expect(clearLoadingMock).toHaveBeenCalledWith('btnChange');
  });

  it('zeigt Fehler bei API-Fehler', async () => {
    changePasswordMock.mockRejectedValue(new Error('Unauthorized'));
    const modal = createModal('alt123', 'neu123', 'neu123');
    await checkPasswort(modal);

    expect(modal.querySelector('#errorMessage')!.innerHTML).toBe('Unauthorized');
    expect(createSnackBarMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
    expect(clearLoadingMock).toHaveBeenCalledWith('btnChange');
  });

  it('wirft Fehler wenn errorMessage fehlt', async () => {
    const modal = document.createElement('div') as CustomHTMLDivElement;
    await expect(checkPasswort(modal)).rejects.toThrow('errorMessage nicht gefunden');
  });

  it('wirft Fehler wenn PasswortAlt Input fehlt', async () => {
    const modal = document.createElement('div') as CustomHTMLDivElement;
    modal.innerHTML = '<div id="errorMessage"></div>';
    await expect(checkPasswort(modal)).rejects.toThrow('PasswortAlt InputElement nicht gefunden');
  });
});
