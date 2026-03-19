import { createSnackBar } from '../class/CustomSnackbar';
import { Logout } from '../Einstellungen/utils';
import { authApi } from './apiService';

let REFRESHED = 0;

export default async function tokenErneuern(retry?: number): Promise<void> {
  if ((retry ?? 0) > 2 || REFRESHED > 2) {
    resetRefreshCounter();
    showErrorAndLogout();
    throw new Error('Zu viele Token-Refresh-Versuche');
  }

  try {
    await authApi.refreshToken();
    incrementRefreshCounter();
  } catch (err: unknown) {
    console.error('Token-Refresh fehlgeschlagen:', err);
    showErrorAndLogout();
    throw new Error('Fehler bei Token erneuerung');
  }
}

function resetRefreshCounter(): void {
  REFRESHED = 0;
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
