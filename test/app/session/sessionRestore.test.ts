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
}));

vi.mock('@/app/init/bootstrap', () => ({
  registerAppStartTask: (task: () => void | Promise<void>) => {
    taskRef.fn = task;
  },
  initializeAppBootstrap: vi.fn(),
}));

vi.mock('@/features/Einstellungen/utils', () => ({
  selectYear: selectYearMock,
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

import { SESSION_RESTORE_SEQUENCE, getSteps, resetSteps } from '@/app/init/initSequence';
import { setNavigationSichtbar } from '@/shared/model/navigation/navigationVisibleStore';

let authModuleLoaded = false;

describe('auth/index.ts — session restore', () => {
  beforeEach(async () => {
    if (!authModuleLoaded) {
      await import('@/app/session/index');
      authModuleLoaded = true;
    }

    document.body.innerHTML = `
      <button id="btnLogin"></button>
      <h1 id="Willkommen"></h1>
      <div id="loginDisplay"></div>
      <input id="Jahr" />
      <div id="MonatFeld" class="db-select d-none"><input id="Monat" /></div>
      <div id="admin" class="d-none"></div>
      <div id="Admin" class="d-none"></div>
      <button id="admin-tab"></button>
      <button id="brand-start-tab"></button>
      <button id="actAsOwnDataButton"></button>
    `;
    setNavigationSichtbar(false);
    vi.clearAllMocks();
    resetSteps('auth-gate');
    resetSteps('session-restore');
    updateActAsBannerMock.mockReturnValue({ active: false });
    isAdminMock.mockReturnValue(false);
    getStoredMonatJahrMock.mockReturnValue({ monat: 4, jahr: 2026 });
    storageCheckMock.mockImplementation((key: string) => key === 'Benutzer');
    storageGetMock.mockImplementation((key: string) => {
      if (key === 'Benutzer') return 'Otto';
      return null;
    });
  });

  it('fuehrt SESSION_RESTORE Steps in deklarierter Reihenfolge aus', async () => {
    getUserCookieMock.mockReturnValue({ userName: 'otto' });

    await taskRef.fn?.();

    const expected = SESSION_RESTORE_SEQUENCE.map(s => s.name);
    expect(getSteps('session-restore')).toEqual(expected);
  });

  it('fuehrt keine SESSION_RESTORE Steps aus wenn kein Cookie', async () => {
    storageCheckMock.mockReturnValue(false);
    getUserCookieMock.mockReturnValue(null);

    await taskRef.fn?.();

    expect(getSteps('session-restore')).toEqual([]);
    expect(getSteps('auth-gate')).toEqual(['cookie:check']);
  });

  it('ruft selectYear auf wenn online', async () => {
    getUserCookieMock.mockReturnValue({ userName: 'otto' });

    await taskRef.fn?.();

    expect(selectYearMock).toHaveBeenCalledWith(4, 2026);
  });
});
