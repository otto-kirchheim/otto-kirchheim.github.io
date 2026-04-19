import { beforeEach, describe, expect, it, vi } from 'bun:test';

const {
  selectYearMock,
  storageSetMock,
  storageRemoveMock,
  setLoadingMock,
  isAdminMock,
  initAutoSaveIndicatorMock,
  mountAdminTabMock,
  createSnackBarMock,
  requestVerificationMailMock,
} = (vi as typeof vi & { hoisted: <T>(factory: () => T) => T }).hoisted(() => ({
  selectYearMock: vi.fn(),
  storageSetMock: vi.fn(),
  storageRemoveMock: vi.fn(),
  setLoadingMock: vi.fn(),
  isAdminMock: vi.fn(),
  initAutoSaveIndicatorMock: vi.fn(),
  mountAdminTabMock: vi.fn(),
  createSnackBarMock: vi.fn(),
  requestVerificationMailMock: vi.fn(),
}));

vi.mock('../src/ts/class/CustomSnackbar', () => ({
  createSnackBar: createSnackBarMock,
}));

vi.mock('../src/ts/features/Login/utils/requestVerificationMail', () => ({
  default: requestVerificationMailMock,
}));

vi.mock('../src/ts/features/Einstellungen/utils', () => ({
  selectYear: selectYearMock,
}));

vi.mock('../src/ts/infrastructure/storage/Storage', () => ({
  default: {
    set: storageSetMock,
    remove: storageRemoveMock,
  },
}));

vi.mock('../src/ts/infrastructure/ui/setLoading', () => ({
  default: setLoadingMock,
}));

vi.mock('../src/ts/infrastructure/tokenManagement/decodeAccessToken', () => ({
  isAdmin: isAdminMock,
}));

vi.mock('../src/ts/infrastructure/autoSave/autoSaveIndicator', () => ({
  initAutoSaveIndicator: initAutoSaveIndicatorMock,
}));

vi.mock('../src/ts/features/Admin', () => ({
  mountAdminTab: mountAdminTabMock,
}));

import userLoginSuccess from '../src/ts/features/Login/utils/userLoginSuccess';
import { featureLifecycleRegistry } from '../src/ts/core/hooks';

describe('userLoginSuccess', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <h1 id="Willkommen"></h1>
      <button id="btnLogin" class="btn"></button>
      <input id="Jahr" />
      <input id="Monat" class="d-none" />
      <div id="admin" class="d-none"></div>
      <div id="Admin" class="d-none"></div>
    `;
    vi.clearAllMocks();
    isAdminMock.mockReturnValue(false);

    featureLifecycleRegistry.clearAll();
    featureLifecycleRegistry.registerFeature({
      name: 'Admin',
      async register(ctx) {
        if (ctx.isAdmin) {
          document.querySelector<HTMLDivElement>('#admin')?.classList.remove('d-none');
          document.querySelector<HTMLDivElement>('#Admin')?.classList.remove('d-none');
          mountAdminTabMock(ctx.userName);
        }
      },
    });
  });

  it('setzt Basis-UI, Storage und startet SelectYear ohne Admin-Tab fuer member', async () => {
    await userLoginSuccess({ username: 'otto', role: 'member' });

    expect(setLoadingMock).toHaveBeenCalledWith('btnLogin');
    expect(storageSetMock).toHaveBeenCalledWith('Version', undefined);
    expect(storageSetMock).toHaveBeenCalledWith('Benutzer', 'Otto');
    expect(storageRemoveMock).toHaveBeenCalledWith('actAsUserId');
    expect(storageRemoveMock).toHaveBeenCalledWith('actAsUserName');
    expect(document.querySelector('#btnLogin')?.classList.contains('d-none')).toBe(true);
    expect(document.querySelector<HTMLInputElement>('#Jahr')?.value).not.toBe('');
    expect(document.querySelector<HTMLInputElement>('#Monat')?.value).not.toBe('');
    expect(document.querySelector<HTMLInputElement>('#Monat')?.classList.contains('d-none')).toBe(false);
    expect(initAutoSaveIndicatorMock).toHaveBeenCalledTimes(1);
    expect(selectYearMock).toHaveBeenCalledTimes(1);
    expect(mountAdminTabMock).not.toHaveBeenCalled();
  });

  it('schaltet Admin-UI frei und mountet Admin-Tab bei Admin-Rolle', async () => {
    await userLoginSuccess({ username: 'otto', role: 'org-admin' });

    expect(document.querySelector('#admin')?.classList.contains('d-none')).toBe(false);
    expect(document.querySelector('#Admin')?.classList.contains('d-none')).toBe(false);
    expect(mountAdminTabMock).toHaveBeenCalledTimes(1);
  });

  it('nutzt isAdmin() wenn keine Rolle uebergeben wurde', async () => {
    isAdminMock.mockReturnValue(true);

    await userLoginSuccess({ username: 'otto' });

    expect(isAdminMock).toHaveBeenCalledTimes(1);
    expect(mountAdminTabMock).toHaveBeenCalledTimes(1);
  });

  it('escaped HTML im Willkommenstext', async () => {
    await userLoginSuccess({ username: '<otto>', role: 'member' });

    expect(document.querySelector<HTMLHeadingElement>('#Willkommen')?.innerHTML).toContain('&lt;otto&gt;');
    expect(document.querySelector<HTMLHeadingElement>('#Willkommen')?.innerHTML).not.toContain('<otto>');
  });

  it('zeigt Warnung und Resend-Aktion wenn email nicht verifiziert ist', async () => {
    await userLoginSuccess({ username: 'otto', role: 'member', emailVerified: false });

    expect(createSnackBarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'warning',
      }),
    );

    const snackbarArg = createSnackBarMock.mock.calls[0]?.[0] as {
      actions?: Array<{ function?: () => void }>;
    };
    snackbarArg.actions?.[0]?.function?.();
    expect(requestVerificationMailMock).toHaveBeenCalledTimes(1);
  });
});
