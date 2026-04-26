import { beforeEach, describe, expect, it, vi } from 'bun:test';

const cancelAllPendingMock = vi.fn();
const clearLoadingMock = vi.fn();
const hideAllFeatureTabsMock = vi.fn();
const resetAbortMock = vi.fn();
const destroyAutoSaveIndicatorMock = vi.fn();
const logoutMock = vi.fn().mockResolvedValue(undefined);
const unmountAdminTabMock = vi.fn();
const getOrCreateInstanceMock = vi.fn();
const showMock = vi.fn();
const publishEventMock = vi.fn();

vi.mock('../src/ts/infrastructure/storage/Storage', () => ({
  default: {
    clear: vi.fn(),
    check: vi.fn(),
  },
}));

vi.mock('../src/ts/infrastructure/api/abortController', () => ({
  abortController: { reset: resetAbortMock },
}));

vi.mock('../src/ts/infrastructure/autoSave/autoSave', () => ({
  cancelAllPending: cancelAllPendingMock,
}));

vi.mock('../src/ts/infrastructure/ui/clearLoading', () => ({
  default: clearLoadingMock,
}));

vi.mock('../src/ts/infrastructure/ui/updateTabVisibility', () => ({
  hideAllFeatureTabs: hideAllFeatureTabsMock,
}));

vi.mock('../src/ts/infrastructure/autoSave/autoSaveIndicator', () => ({
  destroyAutoSaveIndicator: destroyAutoSaveIndicatorMock,
}));

vi.mock('../src/ts/infrastructure/api/apiService', () => ({
  authApi: {
    logout: logoutMock,
  },
}));

vi.mock('../src/ts/Admin', () => ({
  unmountAdminTab: unmountAdminTabMock,
}));

vi.mock('../src/ts/core/events/appEvents', () => ({
  publishEvent: publishEventMock,
}));

vi.mock('bootstrap/js/dist/tab', () => ({
  default: {
    getOrCreateInstance: getOrCreateInstanceMock,
  },
}));

import logoutUser from '../src/ts/features/Einstellungen/utils/logoutUser';
import Storage from '../src/ts/infrastructure/storage/Storage';

describe('logoutUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (Storage.check as ReturnType<typeof vi.fn>).mockReturnValue(true);
    document.body.innerHTML = `
      <button id="start-tab"></button>
      <button id="btnLogin" class="d-none"></button>
      <div id="navmenu"></div>
      <button id="btn-navmenu"></button>
      <div id="admin"></div>
      <input id="Monat" />
      <h1 id="Willkommen">Hallo</h1>
    `;
    getOrCreateInstanceMock.mockReturnValue({ show: showMock });
    Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true });
  });

  it('überspringt den Server-Logout bei lokalem Forced-Logout', async () => {
    logoutUser({ serverLogout: false });
    await Promise.resolve();

    expect(logoutMock).not.toHaveBeenCalled();
    expect(Storage.clear).toHaveBeenCalledTimes(1);
    expect(showMock).toHaveBeenCalledTimes(1);
    expect(publishEventMock).toHaveBeenCalledWith('user:logout', { reason: 'manual' });
  });

  it('führt beim normalen Logout den Server-Logout aus', async () => {
    logoutUser();
    await Promise.resolve();

    expect(logoutMock).toHaveBeenCalledTimes(1);
  });

  it('überspringt den Server-Logout ohne Access-Token', async () => {
    (Storage.check as ReturnType<typeof vi.fn>).mockReturnValue(false);

    logoutUser();
    await Promise.resolve();

    expect(logoutMock).not.toHaveBeenCalled();
  });

  it('zeigt Tab nicht wenn #start-tab kein HTMLButtonElement ist', () => {
    document.body.innerHTML = `
      <div id="start-tab"></div>
      <button id="btnLogin" class="d-none"></button>
    `;

    logoutUser({ serverLogout: false });

    expect(getOrCreateInstanceMock).not.toHaveBeenCalled();
  });

  it('published version-mismatch reason when provided', () => {
    logoutUser({ serverLogout: false, reason: 'version-mismatch' });

    expect(publishEventMock).toHaveBeenCalledWith('user:logout', { reason: 'version-mismatch' });
  });

  it('setzt Willkommen-Text auch wenn Element fehlt (kein Fehler)', () => {
    document.body.innerHTML = `
      <button id="start-tab"></button>
      <button id="btnLogin" class="d-none"></button>
    `;
    getOrCreateInstanceMock.mockReturnValue({ show: showMock });

    expect(() => logoutUser({ serverLogout: false })).not.toThrow();
  });
});
