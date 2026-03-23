import { Storage, buttonDisable, clearLoading, setLoading } from '.';
import { saveEinstellungen } from '../Einstellungen/utils';
import { createSnackBar } from '../class/CustomSnackbar';
import type { IVorgabenU } from '../interfaces';
import { flushAll, getResourceStatus, markResourceSaved } from './autoSave';
import { profileApi } from './apiService';

function hasLocalSettingsChanges(previousData: IVorgabenU, nextData: IVorgabenU): boolean {
  return JSON.stringify(previousData) !== JSON.stringify(nextData);
}

/**
 * Speichert alle Daten: Tabellen-Änderungen via AutoSave-Flush + Einstellungen via API.
 * Ersetzt den alten einzelnen POST /saveData Call.
 */

export default async function saveDaten(button: HTMLButtonElement | null, _Monat?: number): Promise<void> {
  if (button === null) return;

  if (!navigator.onLine) {
    createSnackBar({
      message: 'Speichern nicht möglich – keine Internetverbindung',
      status: 'error',
      timeout: 3000,
      fixed: true,
    });
    return;
  }

  setLoading(button.id);
  buttonDisable(true);

  try {
    const previousUserData = Storage.get<IVorgabenU>('VorgabenU', { check: true });

    // 1. Einstellungen aus dem Formular sammeln und speichern
    const userData = saveEinstellungen();
    Storage.set('VorgabenU', userData);
    const settingsChanged = hasLocalSettingsChanges(previousUserData, userData);
    const settingsStatus = getResourceStatus('settings').status;
    const settingsNeedsSync = settingsChanged || settingsStatus === 'pending' || settingsStatus === 'error';

    // 2. Alle ausstehenden Tabellen-Änderungen sofort senden
    await flushAll();

    // 3. Profil nur bei Änderungen speichern
    const profileResult = settingsNeedsSync ? await profileApi.updateMyProfile(userData) : null;

    // 4. Wrapper-Timestamp mit Server-Zeit aktualisieren
    if (profileResult?.updatedAt) {
      Storage.setWithTimestamp('VorgabenU', userData, Date.parse(profileResult.updatedAt));
    }

    // 5. Settings-Resource als gespeichert markieren, sobald sie explizit synchronisiert wurde.
    if (settingsNeedsSync) markResourceSaved('settings');

    createSnackBar({
      message: `Speichern<br/>Daten gespeichert`,
      status: 'success',
      timeout: 3000,
      fixed: true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Speichern fehlgeschlagen:', msg);
    createSnackBar({
      message: `Speichern<br/>Es ist ein Fehler aufgetreten: ${msg}`,
      status: 'error',
      timeout: 3000,
      fixed: true,
    });
  } finally {
    clearLoading(button.id);
    buttonDisable(false);
  }
}
