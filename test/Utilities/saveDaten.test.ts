import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Hoisted mocks ---
const {
  mockSetLoading,
  mockClearLoading,
  mockButtonDisable,
  mockCreateSnackBar,
  mockFlushAll,
  mockGetResourceStatus,
  mockMarkResourceSaved,
  mockUpdateMyProfile,
  mockSaveEinstellungen,
} = vi.hoisted(() => ({
  mockSetLoading: vi.fn(),
  mockClearLoading: vi.fn(),
  mockButtonDisable: vi.fn(),
  mockCreateSnackBar: vi.fn(),
  mockFlushAll: vi.fn(),
  mockGetResourceStatus: vi.fn(),
  mockMarkResourceSaved: vi.fn(),
  mockUpdateMyProfile: vi.fn(),
  mockSaveEinstellungen: vi.fn(),
}));

// --- Mocks ---
vi.mock('../../src/ts/utilities/setLoading', () => ({ default: mockSetLoading }));
vi.mock('../../src/ts/utilities/clearLoading', () => ({ default: mockClearLoading }));
vi.mock('../../src/ts/utilities/buttonDisable', () => ({ default: mockButtonDisable }));
vi.mock('../../src/ts/class/CustomSnackbar', () => ({ createSnackBar: mockCreateSnackBar }));
vi.mock('../../src/ts/utilities/autoSave', () => ({
  flushAll: mockFlushAll,
  getResourceStatus: mockGetResourceStatus,
  markResourceSaved: mockMarkResourceSaved,
}));
vi.mock('../../src/ts/utilities/apiService', () => ({
  profileApi: { updateMyProfile: mockUpdateMyProfile },
}));
vi.mock('../../src/ts/Einstellungen/utils', () => ({
  saveEinstellungen: mockSaveEinstellungen,
}));
vi.mock('../../src/ts/Einstellungen/utils/index', () => ({
  saveEinstellungen: mockSaveEinstellungen,
}));

import Storage from '../../src/ts/utilities/Storage';
import saveDaten from '../../src/ts/utilities/saveDaten';

describe('saveDaten', () => {
  let button: HTMLButtonElement;
  const mockUserData = { pers: { Vorname: 'Test' } };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    document.body.innerHTML = '<button id="btnSave"></button>';
    button = document.getElementById('btnSave') as HTMLButtonElement;
    Storage.set('VorgabenU', { pers: { Vorname: 'Alt' } });

    mockSaveEinstellungen.mockReturnValue(mockUserData);
    mockUpdateMyProfile.mockResolvedValue({ data: mockUserData, updatedAt: '2026-03-07T12:00:00.000Z' });
    mockFlushAll.mockResolvedValue(undefined);
    mockGetResourceStatus.mockReturnValue({ status: 'idle', timer: null, lastSaved: null, lastError: null });

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
    expect(Storage.get('VorgabenU')).toEqual(mockUserData);
  });

  it('übernimmt serverseitig normalisierte Profilwerte', async () => {
    const normalizedProfile = {
      pers: { Vorname: 'Test', Nachname: 'Normalisiert' },
    };
    mockUpdateMyProfile.mockResolvedValue({ data: normalizedProfile, updatedAt: '2026-03-07T12:00:00.000Z' });

    await saveDaten(button);

    expect(Storage.get('VorgabenU')).toEqual(normalizedProfile);
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
});
