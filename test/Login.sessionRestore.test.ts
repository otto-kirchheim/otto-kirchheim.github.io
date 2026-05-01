import { beforeEach, describe, expect, it, vi } from 'bun:test';

const {
  taskRef,
  selectYearMock,
  updateActAsBannerMock,
  updateTabVisibilityMock,
  isAdminMock,
  getUserCookieMock,
  initAutoSaveIndicatorMock,
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
  initAutoSaveIndicatorMock: vi.fn(),
  initAutoSaveEventListenerMock: vi.fn(),
  storageCheckMock: vi.fn(),
  storageGetMock: vi.fn(),
  storageRemoveMock: vi.fn(),
  getStoredMonatJahrMock: vi.fn(),
  handleAuthUrlStateMock: vi.fn(),
  createModalLoginMock: vi.fn(),
}));

vi.mock('@/core/bootstrap', () => ({
  registerAppStartTask: (task: () => void | Promise<void>) => {
    taskRef.fn = task;
  },
  initializeAppBootstrap: vi.fn(),
}));

vi.mock('@/features/Einstellungen/utils', () => ({
  selectYear: selectYearMock,
}));

vi.mock('@/infrastructure/ui/actAsStatus', () => ({
  ACT_AS_STATUS_EVENT: 'actAsStatus',
  updateActAsBanner: updateActAsBannerMock,
}));

vi.mock('@/infrastructure/date/dateStorage', () => ({
  getStoredMonatJahr: getStoredMonatJahrMock,
}));

vi.mock('@/infrastructure/storage/Storage', () => ({
  default: {
    check: storageCheckMock,
    get: storageGetMock,
    remove: storageRemoveMock,
  },
}));

vi.mock('@/infrastructure/ui/updateTabVisibility', () => ({
  default: updateTabVisibilityMock,
}));

vi.mock('@/infrastructure/tokenManagement/decodeAccessToken', () => ({
  getUserCookie: getUserCookieMock,
  isAdmin: isAdminMock,
}));

vi.mock('@/infrastructure/autoSave/autoSaveIndicator', () => ({
  initAutoSaveIndicator: initAutoSaveIndicatorMock,
}));

vi.mock('@/infrastructure/autoSave/autoSave', () => ({
  initAutoSaveEventListener: initAutoSaveEventListenerMock,
  createOnChangeHandler: vi.fn(),
  setAutoSaveEnabled: vi.fn(),
  setAutoSaveDelay: vi.fn(),
}));

vi.mock('@/core/orchestration/auth/components', () => ({
  createModalLogin: createModalLoginMock,
}));

vi.mock('@/core/orchestration/auth/utils', () => ({
  handleAuthUrlState: handleAuthUrlStateMock,
}));

import { SESSION_RESTORE_SEQUENCE, getSteps, resetSteps } from '@/core/orchestration/initSequence';

let authModuleLoaded = false;

describe('auth/index.ts — session restore', () => {
  beforeEach(async () => {
    if (!authModuleLoaded) {
      await import('@/core/orchestration/auth/index');
      authModuleLoaded = true;
    }

    document.body.innerHTML = `
      <button id="btnLogin"></button>
      <h1 id="Willkommen"></h1>
      <div id="loginDisplay"></div>
      <input id="Jahr" />
      <input id="Monat" class="d-none" />
      <div id="admin" class="d-none"></div>
      <div id="Admin" class="d-none"></div>
      <button id="admin-tab"></button>
      <button id="brand-start-tab"></button>
      <div id="navmenu" class="d-none"></div>
      <button id="btn-navmenu" class="d-none"></button>
      <button id="actAsOwnDataButton"></button>
    `;
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
