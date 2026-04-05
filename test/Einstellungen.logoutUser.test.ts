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

vi.mock('../src/ts/utilities', () => ({
  Storage: {
    clear: vi.fn(),
    check: vi.fn(),
  },
  abortController: { reset: resetAbortMock },
  cancelAllPending: cancelAllPendingMock,
  clearLoading: clearLoadingMock,
  hideAllFeatureTabs: hideAllFeatureTabsMock,
}));

vi.mock('../src/ts/utilities/autoSaveIndicator', () => ({
  destroyAutoSaveIndicator: destroyAutoSaveIndicatorMock,
}));

vi.mock('../src/ts/utilities/apiService', () => ({
  authApi: {
    logout: logoutMock,
  },
}));

vi.mock('../src/ts/Admin', () => ({
  unmountAdminTab: unmountAdminTabMock,
}));

vi.mock('bootstrap/js/dist/tab', () => ({
  default: {
    getOrCreateInstance: getOrCreateInstanceMock,
  },
}));

import logoutUser from '../src/ts/Einstellungen/utils/logoutUser';
import { Storage } from '../src/ts/utilities';

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
});
