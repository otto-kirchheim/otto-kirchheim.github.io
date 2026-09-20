import { createSnackBar } from '../ui/CustomSnackbar';
import { authApi } from '../api/apiService';
import Storage from '../storage/Storage';
import { invokeHook } from '@/core/hooks';

let REFRESHED = 0;
let isLogoutInProgress = false;

/**
 * Erneuert das Access-Token über `authApi.refreshToken()` und speichert die Rolle. Bricht nach
 * mehr als zwei Wiederholungen oder mehr als zwei Erneuerungen seit dem letzten Login ab, um
 * Refresh-Schleifen zu vermeiden: dann Fehlermeldung, `auth:failure`-Hook und Fehler. Läuft
 * bereits ein Logout, tut der Aufruf nichts.
 *
 * @param retry - Nummer des aktuellen Wiederholungsversuchs; Standard 0.
 * @throws {Error} Bei zu vielen Versuchen oder wenn der Refresh fehlschlägt.
 */
export default async function tokenErneuern(retry?: number): Promise<void> {
  if (isLogoutInProgress) return;
  if ((retry ?? 0) > 2 || REFRESHED > 2) {
    resetRefreshCounter();
    isLogoutInProgress = true;
    showErrorAndLogout();
    throw new Error('Zu viele Token-Refresh-Versuche');
  }

  try {
    const userData = await authApi.refreshToken();
    if (userData?.role) Storage.set('BenutzerRolle', userData.role);
    incrementRefreshCounter();
  } catch (err: unknown) {
    console.error('Token-Refresh fehlgeschlagen:', err);
    isLogoutInProgress = true;
    showErrorAndLogout();
    throw new Error('Fehler bei Token erneuerung', { cause: err });
  }
}

/** Setzt Refresh-Zähler und Logout-Sperre zurück. */
function resetRefreshCounter(): void {
  REFRESHED = 0;
  isLogoutInProgress = false;
}

/** Setzt Refresh-Zähler und Logout-Sperre zurück; nach erfolgreichem Login aufrufen. */
export function resetTokenState(): void {
  REFRESHED = 0;
  isLogoutInProgress = false;
}

/** Zählt eine erfolgreiche Token-Erneuerung mit. */
function incrementRefreshCounter(): void {
  REFRESHED++;
}

/** Löst den `auth:failure`-Hook aus und zeigt eine Fehler-Snackbar zur erneuten Anmeldung. */
function showErrorAndLogout(): void {
  invokeHook('auth:failure');
  createSnackBar({
    message: `Login<br/>Fehlerhafte Anmeldung,</br> bitte Erneut anmelden!`,
    status: 'error',
    timeout: 3000,
    fixed: true,
  });
}
