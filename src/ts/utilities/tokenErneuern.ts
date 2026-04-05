import { createSnackBar } from '../class/CustomSnackbar';
import { logoutUser } from '../Einstellungen/utils';
import { authApi } from './apiService';
import Storage from './Storage';

let REFRESHED = 0;
let isLogoutInProgress = false;

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

function resetRefreshCounter(): void {
  REFRESHED = 0;
  isLogoutInProgress = false;
}

/** Setzt internen Modulzustand zurück (nach erfolgreichem Login aufrufen). */
export function resetTokenState(): void {
  REFRESHED = 0;
  isLogoutInProgress = false;
}

function incrementRefreshCounter(): void {
  REFRESHED++;
}

function showErrorAndLogout(): void {
  logoutUser();
  createSnackBar({
    message: `Login<br/>Fehlerhafte Anmeldung,</br> bitte Erneut anmelden!`,
    status: 'error',
    timeout: 3000,
    fixed: true,
  });
}
