import { beforeEach, describe, expect, it, vi } from 'bun:test';

const cancelAllPendingMock = vi.fn();
const clearLoadingMock = vi.fn();
const hideAllFeatureTabsMock = vi.fn();
const resetAbortMock = vi.fn();
const logoutMock = vi.fn().mockResolvedValue(undefined);
const unmountAdminTabMock = vi.fn();
const zeigeTabMock = vi.fn(() => true);
const publishEventMock = vi.fn();

vi.mock('@/shared/lib/storage/Storage', () => ({
  default: {
    clear: vi.fn(),
    check: vi.fn(),
  },
}));

vi.mock('@/shared/api/abortController', () => ({
  abortController: { reset: resetAbortMock },
}));

vi.mock('@/shared/lib/autosave/autoSave', () => ({
  cancelAllPending: cancelAllPendingMock,
  onAutoSaveStatus: vi.fn(() => () => {}),
}));

vi.mock('@/shared/ui/button-loading/clearLoading', () => ({
  default: clearLoadingMock,
}));

vi.mock('@/infrastructure/ui/updateTabVisibility', () => ({
  hideAllFeatureTabs: hideAllFeatureTabsMock,
}));

vi.mock('@/shared/api/apiService', () => ({
  authApi: {
    logout: logoutMock,
  },
}));

vi.mock('@/Admin', () => ({
  unmountAdminTab: unmountAdminTabMock,
}));

vi.mock('@/shared/lib/events/appEvents', () => ({
  publishEvent: publishEventMock,
}));

vi.mock('@/infrastructure/ui/tabController', () => ({
  zeigeTab: zeigeTabMock,
}));

import logoutUser from '@/features/auth/model/logoutUser';
import Storage from '@/shared/lib/storage/Storage';
import { isNavigationSichtbar, setNavigationSichtbar } from '@/shared/model/navigation/navigationVisibleStore';

describe('logoutUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (Storage.check as ReturnType<typeof vi.fn>).mockReturnValue(true);
    setNavigationSichtbar(true);
    document.body.innerHTML = `
      <div id="tabContent"><div class="tab-pane" id="start"></div></div>
      <button id="start-tab" data-tab-target="start"></button>
      <button id="btnLogin" class="d-none"></button>
      <div id="admin"></div>
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

  it('versteckt die Navigation und BEIDE #admin-Kopien (Desktop- + Drawer-Kopie)', () => {
    expect(isNavigationSichtbar()).toBe(true);

    logoutUser({ serverLogout: false });

    expect(isNavigationSichtbar()).toBe(false);
    const adminElemente = document.querySelectorAll<HTMLDivElement>('#admin');
    expect(adminElemente).toHaveLength(2);
    adminElemente.forEach(el => expect(el.classList.contains('d-none')).toBe(true));
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
