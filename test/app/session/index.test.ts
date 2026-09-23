import { beforeEach, describe, expect, it, vi } from 'bun:test';

const {
  taskRef,
  selectYearMock,
  updateActAsBannerMock,
  updateTabVisibilityMock,
  isAdminMock,
  getUserCookieMock,
  initAutoSaveEventListenerMock,
  storageCheckMock,
  storageGetMock,
  storageRemoveMock,
  getStoredMonatJahrMock,
  handleAuthUrlStateMock,
  createModalLoginMock,
  mountAdminTabMock,
  loadOwnUserDataMock,
} = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  taskRef: { fn: null as (() => void | Promise<void>) | null },
  selectYearMock: vi.fn(),
  updateActAsBannerMock: vi.fn(),
  updateTabVisibilityMock: vi.fn(),
  isAdminMock: vi.fn(),
  getUserCookieMock: vi.fn(),
  initAutoSaveEventListenerMock: vi.fn(),
  storageCheckMock: vi.fn(),
  storageGetMock: vi.fn(),
  storageRemoveMock: vi.fn(),
  getStoredMonatJahrMock: vi.fn(),
  handleAuthUrlStateMock: vi.fn(),
  createModalLoginMock: vi.fn(),
  mountAdminTabMock: vi.fn(),
  loadOwnUserDataMock: vi.fn(),
}));

vi.mock('@/app/init/bootstrap', () => ({
  registerAppStartTask: (task: () => void | Promise<void>) => {
    taskRef.fn = task;
  },
  initializeAppBootstrap: vi.fn(),
}));

vi.mock('@/app/session/selectYear', () => ({
  default: selectYearMock,
}));

vi.mock('@/shared/model/session/actAsStatus', () => ({
  ACT_AS_STATUS_EVENT: 'actAsStatus',
  updateActAsBanner: updateActAsBannerMock,
}));

vi.mock('@/shared/lib/date/dateStorage', () => ({
  getStoredMonatJahr: getStoredMonatJahrMock,
}));

vi.mock('@/shared/lib/storage/Storage', () => ({
  default: {
    check: storageCheckMock,
    get: storageGetMock,
    remove: storageRemoveMock,
  },
}));

vi.mock('@/infrastructure/ui/updateTabVisibility', () => ({
  default: updateTabVisibilityMock,
}));

vi.mock('@/shared/api/token/decodeAccessToken', () => ({
  getUserCookie: getUserCookieMock,
  isAdmin: isAdminMock,
}));

vi.mock('@/shared/lib/autosave/autoSave', () => ({
  initAutoSaveEventListener: initAutoSaveEventListenerMock,
  createOnChangeHandler: vi.fn(),
  setAutoSaveEnabled: vi.fn(),
  setAutoSaveDelay: vi.fn(),
  onAutoSaveStatus: vi.fn(() => () => {}),
}));

vi.mock('@/features/auth/ui', () => ({
  createModalLogin: createModalLoginMock,
}));

vi.mock('@/features/auth/model', () => ({
  handleAuthUrlState: handleAuthUrlStateMock,
}));

vi.mock('@/pages/admin/mountAdminTab', () => ({
  mountAdminTab: mountAdminTabMock,
}));

vi.mock('@/pages/admin/model/actAs', () => ({
  loadOwnUserData: loadOwnUserDataMock,
}));

import { SESSION_RESTORE_SEQUENCE, getSteps, resetSteps } from '@/app/init/initSequence';
import { isNavigationSichtbar, setNavigationSichtbar } from '@/shared/model/navigation/navigationVisibleStore';

let authModuleLoaded = false;

// `#admin`/`#admin-tab` bewusst ZWEIMAL im Fixture (Desktop-Kopfzeile + Drawer-Kopie von
// `DBHeader`, Phase K5) -- deckt ab, dass beide Kopien getroffen werden (`querySelectorAll`
// statt `querySelector`).
function setupDom(): void {
  document.body.innerHTML = `
    <button id="btnLogin"></button>
    <h1 id="Willkommen"></h1>
    <div id="loginDisplay"></div>
    <input id="Jahr" />
    <input id="Monat" class="d-none" />
    <div id="admin" class="d-none"></div>
    <div id="admin" class="d-none"></div>
    <div id="Admin" class="d-none"></div>
    <button id="admin-tab"></button>
    <button id="admin-tab"></button>
    <button id="brand-start-tab"></button>
    <button id="actAsOwnDataButton"></button>
  `;
}

describe('auth/index.ts', () => {
  beforeEach(async () => {
    if (!authModuleLoaded) {
      await import('@/app/session/index');
      authModuleLoaded = true;
    }

    setupDom();
    vi.clearAllMocks();
    setNavigationSichtbar(false);
    resetSteps('auth-gate');
    resetSteps('session-restore');
    resetSteps('boot');
    updateActAsBannerMock.mockReturnValue({ active: false });
    isAdminMock.mockReturnValue(false);
    getStoredMonatJahrMock.mockReturnValue({ monat: 4, jahr: 2026 });
    storageCheckMock.mockImplementation((key: string) => key === 'Benutzer');
    storageGetMock.mockImplementation((key: string) => {
      if (key === 'Benutzer') return 'Otto';
      return null;
    });
    window.location.hash = '';
  });

  it('entfernt VorgabenU aus dem Storage wenn endeB.Nwoche fehlt', async () => {
    storageCheckMock.mockImplementation((key: string) => key === 'Benutzer' || key === 'VorgabenU');
    storageGetMock.mockImplementation((key: string) => {
      if (key === 'Benutzer') return 'Otto';
      if (key === 'VorgabenU') return { VorgabenB: [{ endeB: {} }] };
      return null;
    });
    getUserCookieMock.mockReturnValue({ userName: 'otto' });

    await taskRef.fn?.();

    expect(storageRemoveMock).toHaveBeenCalledWith('VorgabenU');
  });

  it('behaelt VorgabenU im Storage wenn endeB.Nwoche vorhanden ist', async () => {
    storageCheckMock.mockImplementation((key: string) => key === 'Benutzer' || key === 'VorgabenU');
    storageGetMock.mockImplementation((key: string) => {
      if (key === 'Benutzer') return 'Otto';
      if (key === 'VorgabenU') return { VorgabenB: [{ endeB: { Nwoche: 3 } }] };
      return null;
    });
    getUserCookieMock.mockReturnValue({ userName: 'otto' });

    await taskRef.fn?.();

    expect(storageRemoveMock).not.toHaveBeenCalledWith('VorgabenU');
  });

  it('mountet den Admin-Tab beim Session-Restore automatisch wenn Benutzer bereits Admin ist', async () => {
    getUserCookieMock.mockReturnValue({ userName: 'otto-admin' });
    isAdminMock.mockReturnValue(true);

    await taskRef.fn?.();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mountAdminTabMock).toHaveBeenCalledWith('otto-admin');
  });

  it('ruft beim Klick auf den admin-tab Button den Mount-Handler erneut auf (bereits gemountet)', async () => {
    getUserCookieMock.mockReturnValue({ userName: 'otto' });
    isAdminMock.mockReturnValue(true);

    await taskRef.fn?.();

    const adminTabButton = document.querySelector<HTMLButtonElement>('#admin-tab');
    adminTabButton?.click();
    await new Promise(resolve => setTimeout(resolve, 0));

    // Admin-Tab wurde bereits im vorherigen Test gemountet (Modul-Singleton) —
    // der Klick-Handler ruft ensureAdminTabMounted dennoch auf, dieses kehrt
    // aber wegen des adminTabMounted-Flags sofort zurück, ohne erneut zu mounten.
    expect(mountAdminTabMock).not.toHaveBeenCalled();
  });

  it('laedt bei Klick auf actAsOwnDataButton die eigenen Benutzerdaten', async () => {
    getUserCookieMock.mockReturnValue({ userName: 'otto' });

    await taskRef.fn?.();

    const actAsButton = document.querySelector<HTMLButtonElement>('#actAsOwnDataButton');
    actAsButton?.click();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(loadOwnUserDataMock).toHaveBeenCalledTimes(1);
  });

  it('entfernt den gespeicherten Benutzer wenn kein anzeigbarer Benutzername ermittelt werden kann', async () => {
    storageCheckMock.mockImplementation((key: string) => key === 'Benutzer');
    storageGetMock.mockImplementation((key: string) => {
      if (key === 'Benutzer') return '';
      return null;
    });
    getUserCookieMock.mockReturnValue({ userName: 'otto' });
    updateActAsBannerMock.mockReturnValue({ active: false });

    await taskRef.fn?.();

    expect(storageRemoveMock).toHaveBeenCalledWith('Benutzer');
    expect(getSteps('session-restore')).toEqual([]);
  });

  it('leitet vom Admin-Hash zurueck auf #start wenn Benutzer kein Admin ist', async () => {
    getUserCookieMock.mockReturnValue({ userName: 'otto' });
    isAdminMock.mockReturnValue(false);
    window.location.hash = '#Admin';

    const brandStartTab = document.querySelector<HTMLButtonElement>('#brand-start-tab');
    const clickSpy = vi.fn();
    brandStartTab?.addEventListener('click', clickSpy);

    await taskRef.fn?.();

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe('#start');
  });

  it('macht die Navigation sichtbar und schaltet BEIDE #admin-Kopien um (Session-Restore, Admin)', async () => {
    getUserCookieMock.mockReturnValue({ userName: 'otto-admin' });
    isAdminMock.mockReturnValue(true);

    expect(isNavigationSichtbar()).toBe(false);

    await taskRef.fn?.();

    expect(isNavigationSichtbar()).toBe(true);
    const adminElemente = document.querySelectorAll<HTMLDivElement>('#admin');
    expect(adminElemente).toHaveLength(2);
    adminElemente.forEach(el => expect(el.classList.contains('d-none')).toBe(false));
  });

  it('versteckt BEIDE #admin-Kopien, wenn kein Benutzer angemeldet ist', async () => {
    storageCheckMock.mockImplementation(() => false);
    storageGetMock.mockImplementation(() => null);

    await taskRef.fn?.();

    const adminElemente = document.querySelectorAll<HTMLDivElement>('#admin');
    adminElemente.forEach(el => expect(el.classList.contains('d-none')).toBe(true));
  });

  it('fuehrt SESSION_RESTORE Steps in deklarierter Reihenfolge aus', async () => {
    getUserCookieMock.mockReturnValue({ userName: 'otto' });

    await taskRef.fn?.();

    const expected = SESSION_RESTORE_SEQUENCE.map(s => s.name);
    expect(getSteps('session-restore')).toEqual(expected);
  });
});
