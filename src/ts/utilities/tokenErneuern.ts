import { createSnackBar } from '../class/CustomSnackbar';
import { Logout } from '../Einstellungen/utils';
import { authApi } from './apiService';

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
    await authApi.refreshToken();
    incrementRefreshCounter();
  } catch (err: unknown) {
    console.error('Token-Refresh fehlgeschlagen:', err);
    isLogoutInProgress = true;
    showErrorAndLogout();
    throw new Error('Fehler bei Token erneuerung');
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
  Logout();
  createSnackBar({
    message: `Login<br/>Fehlerhafte Anmeldung,</br> bitte Erneut anmelden!`,
    status: 'error',
    timeout: 3000,
    fixed: true,
  });
}
