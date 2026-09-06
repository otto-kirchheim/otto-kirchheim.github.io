import { beforeEach, describe, expect, it, vi } from 'bun:test';

const cancelAllPendingMock = vi.fn();
const clearLoadingMock = vi.fn();
const hideAllFeatureTabsMock = vi.fn();
const resetAbortMock = vi.fn();
const destroyAutoSaveIndicatorMock = vi.fn();
const logoutMock = vi.fn().mockResolvedValue(undefined);
const unmountAdminTabMock = vi.fn();
const zeigeTabMock = vi.fn(() => true);
const publishEventMock = vi.fn();

vi.mock('@/infrastructure/storage/Storage', () => ({
  default: {
    clear: vi.fn(),
    check: vi.fn(),
  },
}));

vi.mock('@/infrastructure/api/abortController', () => ({
  abortController: { reset: resetAbortMock },
}));

vi.mock('@/infrastructure/autoSave/autoSave', () => ({
  cancelAllPending: cancelAllPendingMock,
}));

vi.mock('@/infrastructure/ui/clearLoading', () => ({
  default: clearLoadingMock,
}));

vi.mock('@/infrastructure/ui/updateTabVisibility', () => ({
  hideAllFeatureTabs: hideAllFeatureTabsMock,
}));

vi.mock('@/infrastructure/autoSave/autoSaveIndicator', () => ({
  destroyAutoSaveIndicator: destroyAutoSaveIndicatorMock,
}));

vi.mock('@/infrastructure/api/apiService', () => ({
  authApi: {
    logout: logoutMock,
  },
}));

vi.mock('@/Admin', () => ({
  unmountAdminTab: unmountAdminTabMock,
}));

vi.mock('@/core/events/appEvents', () => ({
  publishEvent: publishEventMock,
}));

vi.mock('@/infrastructure/ui/tabController', () => ({
  zeigeTab: zeigeTabMock,
}));

import logoutUser from '@/features/Einstellungen/utils/logoutUser';
import Storage from '@/infrastructure/storage/Storage';

describe('logoutUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (Storage.check as ReturnType<typeof vi.fn>).mockReturnValue(true);
    document.body.innerHTML = `
      <div id="tabContent"><div class="tab-pane" id="start"></div></div>
      <button id="start-tab" data-tab-target="start"></button>
      <button id="btnLogin" class="d-none"></button>
      <div id="navmenu"></div>
      <button id="btn-navmenu"></button>
      <div id="admin"></div>
      <input id="Monat" />
      <h1 id="Willkommen">Hallo</h1>
    `;
    zeigeTabMock.mockReturnValue(true);
    Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true });
  });

  it('überspringt den Server-Logout bei lokalem Forced-Logout', async () => {
    logoutUser({ serverLogout: false });
    await Promise.resolve();

    expect(logoutMock).not.toHaveBeenCalled();
    expect(Storage.clear).toHaveBeenCalledTimes(1);
    expect(zeigeTabMock).toHaveBeenCalledWith('start');
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

  it('scrollt nicht, wenn es das Start-Panel nicht gibt', () => {
    document.body.innerHTML = `
      <button id="btnLogin" class="d-none"></button>
    `;
    zeigeTabMock.mockReturnValue(false);

    logoutUser({ serverLogout: false });

    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('published version-mismatch reason when provided', () => {
    logoutUser({ serverLogout: false, reason: 'version-mismatch' });

    expect(publishEventMock).toHaveBeenCalledWith('user:logout', { reason: 'version-mismatch' });
  });

  it('setzt Willkommen-Text auch wenn Element fehlt (kein Fehler)', () => {
    document.body.innerHTML = `
      <button id="start-tab" data-tab-target="start"></button>
      <button id="btnLogin" class="d-none"></button>
    `;
    zeigeTabMock.mockReturnValue(true);

    expect(() => logoutUser({ serverLogout: false })).not.toThrow();
  });

  it('fängt einen fehlschlagenden Server-Logout still ab', async () => {
    logoutMock.mockRejectedValueOnce(new Error('Netzwerkfehler'));

    expect(() => logoutUser()).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();

    expect(logoutMock).toHaveBeenCalledTimes(1);
  });
});
