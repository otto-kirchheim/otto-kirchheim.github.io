import { beforeEach, describe, expect, it, vi } from 'bun:test';

const viCompat = vi as typeof vi & {
  hoisted: <T>(factory: () => T) => T;
};

// --- Hoisted mocks ---
const {
  mockSetLoading,
  mockClearLoading,
  mockButtonDisable,
  mockCreateSnackBar,
  mockFlushAll,
  mockGetResourceStatus,
  mockMarkResourcesIdle,
  mockMarkResourceSaved,
  mockHasPendingTableChanges,
  mockUpdateMyProfile,
  mockSaveEinstellungen,
} = viCompat.hoisted(() => ({
  mockSetLoading: vi.fn(),
  mockClearLoading: vi.fn(),
  mockButtonDisable: vi.fn(),
  mockCreateSnackBar: vi.fn(),
  mockFlushAll: vi.fn(),
  mockGetResourceStatus: vi.fn(),
  mockMarkResourcesIdle: vi.fn(),
  mockMarkResourceSaved: vi.fn(),
  mockHasPendingTableChanges: vi.fn(),
  mockUpdateMyProfile: vi.fn(),
  mockSaveEinstellungen: vi.fn(),
}));

// --- Mocks ---
vi.mock('../../src/ts/infrastructure/ui/setLoading', () => ({ default: mockSetLoading }));
vi.mock('../../src/ts/infrastructure/ui/clearLoading', () => ({ default: mockClearLoading }));
vi.mock('../../src/ts/infrastructure/ui/buttonDisable', () => ({ default: mockButtonDisable }));
vi.mock('../../src/ts/class/CustomSnackbar', () => ({ createSnackBar: mockCreateSnackBar }));
vi.mock('../../src/ts/infrastructure/autoSave/autoSave', () => ({
  flushAll: mockFlushAll,
  getResourceStatus: mockGetResourceStatus,
  markResourcesIdle: mockMarkResourcesIdle,
  markResourceSaved: mockMarkResourceSaved,
  hasPendingTableChanges: mockHasPendingTableChanges,
}));
vi.mock('../../src/ts/infrastructure/api/apiService', () => ({
  profileApi: { updateMyProfile: mockUpdateMyProfile },
}));

import Storage from '../../src/ts/infrastructure/storage/Storage';
import saveDaten from '../../src/ts/infrastructure/data/saveDaten';
import { registerHook, clearAllHooks } from '../../src/ts/core/hooks';

describe('saveDaten', () => {
  let button: HTMLButtonElement;
  const mockUserData = { pers: { Vorname: 'Test' } };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    clearAllHooks();
    registerHook('pre-save:settings', mockSaveEinstellungen);

    document.body.innerHTML = '<button id="btnSave"></button>';
    button = document.getElementById('btnSave') as HTMLButtonElement;
    Storage.set('VorgabenU', { pers: { Vorname: 'Alt' } });

    mockSaveEinstellungen.mockReturnValue(mockUserData);
    mockUpdateMyProfile.mockResolvedValue({ data: mockUserData, updatedAt: '2026-03-07T12:00:00.000Z' });
    mockFlushAll.mockResolvedValue(undefined);
    mockGetResourceStatus.mockReturnValue({ status: 'idle', timer: null, lastSaved: null, lastError: null });
    mockHasPendingTableChanges.mockReturnValue(false);

    // navigator.onLine standardmäßig auf true
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  });

  it('bricht ab wenn Button null ist', async () => {
    await saveDaten(null);
    expect(mockSetLoading).not.toHaveBeenCalled();
  });

  it('zeigt Offline-Snackbar wenn keine Verbindung', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    await saveDaten(button);
    expect(mockCreateSnackBar).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('keine Internetverbindung'),
        status: 'error',
      }),
    );
    expect(mockSetLoading).not.toHaveBeenCalled();
  });

  it('setzt Loading und deaktiviert Buttons', async () => {
    await saveDaten(button);
    expect(mockSetLoading).toHaveBeenCalledWith('btnSave');
    expect(mockButtonDisable).toHaveBeenCalledWith(true);
  });

  it('speichert Einstellungen und flusht alle Änderungen', async () => {
    await saveDaten(button);
    expect(mockSaveEinstellungen).toHaveBeenCalled();
    expect(mockUpdateMyProfile).toHaveBeenCalledWith(mockUserData);
    expect(mockFlushAll).toHaveBeenCalled();
    expect(mockMarkResourceSaved).toHaveBeenCalledWith('settings');
  });

  it('setzt Ressourcenstatus beim manuellen Save auf idle zurück', async () => {
    await saveDaten(button);

    // markResourcesIdle darf nicht mehr aufgerufen werden (war der ursprüngliche Bug).
    expect(mockMarkResourcesIdle).not.toHaveBeenCalled();
  });

  it('sendet Settings nicht erneut wenn lokal unverändert', async () => {
    Storage.set('VorgabenU', mockUserData);
    await saveDaten(button);
    expect(mockFlushAll).toHaveBeenCalled();
    expect(mockUpdateMyProfile).not.toHaveBeenCalled();
    expect(mockMarkResourceSaved).not.toHaveBeenCalled();
  });

  it('synchronisiert Settings bei pending AutoSave auch ohne lokale Differenz', async () => {
    Storage.set('VorgabenU', mockUserData);
    mockGetResourceStatus.mockReturnValue({ status: 'pending', timer: null, lastSaved: null, lastError: null });

    await saveDaten(button);

    expect(mockUpdateMyProfile).toHaveBeenCalledWith(mockUserData);
    expect(mockMarkResourceSaved).toHaveBeenCalledWith('settings');
  });

  it('synchronisiert Settings bei error AutoSave auch ohne lokale Differenz', async () => {
    Storage.set('VorgabenU', mockUserData);
    mockGetResourceStatus.mockReturnValue({ status: 'error', timer: null, lastSaved: null, lastError: 'x' });

    await saveDaten(button);

    expect(mockUpdateMyProfile).toHaveBeenCalledWith(mockUserData);
    expect(mockMarkResourceSaved).toHaveBeenCalledWith('settings');
  });

  it('speichert UserData in Storage', async () => {
    await saveDaten(button);
    expect(Storage.get<typeof mockUserData>('VorgabenU')).toEqual(mockUserData);
  });

  it('übernimmt serverseitig normalisierte Profilwerte', async () => {
    const normalizedProfile = {
      pers: { Vorname: 'Test', Nachname: 'Normalisiert' },
    };
    mockUpdateMyProfile.mockResolvedValue({ data: normalizedProfile, updatedAt: '2026-03-07T12:00:00.000Z' });

    await saveDaten(button);

    expect(Storage.get<typeof normalizedProfile>('VorgabenU')).toEqual(normalizedProfile);
  });

  it('zeigt Erfolgs-Snackbar bei Erfolg', async () => {
    await saveDaten(button);
    expect(mockCreateSnackBar).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Daten gespeichert'),
        status: 'success',
      }),
    );
  });

  it('zeigt Fehler-Snackbar bei API-Fehler', async () => {
    mockUpdateMyProfile.mockRejectedValue(new Error('Network error'));
    await saveDaten(button);
    expect(mockCreateSnackBar).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Network error'),
        status: 'error',
      }),
    );
  });

  it('zeigt Fehler-Snackbar bei flushAll-Fehler', async () => {
    mockFlushAll.mockRejectedValue(new Error('Flush failed'));
    await saveDaten(button);
    expect(mockCreateSnackBar).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Flush failed'),
        status: 'error',
      }),
    );
  });

  it('räumt Loading in finally auf', async () => {
    mockUpdateMyProfile.mockRejectedValue(new Error('fail'));
    await saveDaten(button);
    expect(mockClearLoading).toHaveBeenCalledWith('btnSave');
    expect(mockButtonDisable).toHaveBeenCalledWith(false);
  });

  it('konvertiert nicht-Error-Objekte in Fehlermeldung', async () => {
    mockFlushAll.mockRejectedValue('string error');
    await saveDaten(button);
    expect(mockCreateSnackBar).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('string error'),
        status: 'error',
      }),
    );
  });

  it('btnSaveB nutzt nur BZ und BE als Ressourcen', async () => {
    document.body.innerHTML = '<button id="btnSaveB"></button>';
    const btnSaveB = document.getElementById('btnSaveB') as HTMLButtonElement;

    await saveDaten(btnSaveB);

    // btnSaveB schließt EWT, N, settings aus → kein EWT/N-hasPendingTableChanges
    expect(mockHasPendingTableChanges).toHaveBeenCalledWith('BZ', true);
    expect(mockHasPendingTableChanges).toHaveBeenCalledWith('BE', true);
    expect(mockHasPendingTableChanges).not.toHaveBeenCalledWith('EWT', true);
    expect(mockHasPendingTableChanges).not.toHaveBeenCalledWith('N', true);
  });

  it('btnSaveE nutzt nur EWT als Ressource', async () => {
    document.body.innerHTML = '<button id="btnSaveE"></button>';
    const btnSaveE = document.getElementById('btnSaveE') as HTMLButtonElement;

    await saveDaten(btnSaveE);

    expect(mockHasPendingTableChanges).toHaveBeenCalledWith('EWT', true);
    expect(mockHasPendingTableChanges).not.toHaveBeenCalledWith('BZ', true);
    expect(mockHasPendingTableChanges).not.toHaveBeenCalledWith('N', true);
  });

  it('btnSaveN nutzt nur N als Ressource', async () => {
    document.body.innerHTML = '<button id="btnSaveN"></button>';
    const btnSaveN = document.getElementById('btnSaveN') as HTMLButtonElement;

    await saveDaten(btnSaveN);

    expect(mockHasPendingTableChanges).toHaveBeenCalledWith('N', true);
    expect(mockHasPendingTableChanges).not.toHaveBeenCalledWith('BZ', true);
    expect(mockHasPendingTableChanges).not.toHaveBeenCalledWith('EWT', true);
  });

  it('btnSaveEinstellungen nutzt nur settings als Ressource', async () => {
    document.body.innerHTML = '<button id="btnSaveEinstellungen"></button>';
    const btnSaveEinstellungen = document.getElementById('btnSaveEinstellungen') as HTMLButtonElement;

    await saveDaten(btnSaveEinstellungen);

    expect(mockHasPendingTableChanges).not.toHaveBeenCalledWith('BZ', true);
    expect(mockHasPendingTableChanges).not.toHaveBeenCalledWith('EWT', true);
    expect(mockHasPendingTableChanges).not.toHaveBeenCalledWith('N', true);
  });

  it('race-condition: markResourceSaved wird für idle BZ nach flush aufgerufen', async () => {
    document.body.innerHTML = '<button id="btnSaveB"></button>';
    const btnSaveB = document.getElementById('btnSaveB') as HTMLButtonElement;

    // hasPendingTableChanges gibt true zurück (vor flush gab es Änderungen)
    mockHasPendingTableChanges.mockReturnValue(true);
    // Nach flush ist der Status idle (Race-Condition: AutoSave hat sich selbst gesaved)
    mockGetResourceStatus.mockReturnValue({ status: 'idle', timer: null, lastSaved: null, lastError: null });

    await saveDaten(btnSaveB);

    expect(mockMarkResourceSaved).toHaveBeenCalledWith('BZ');
    expect(mockMarkResourceSaved).toHaveBeenCalledWith('BE');
  });
});
