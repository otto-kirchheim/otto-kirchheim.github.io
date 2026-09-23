import userLoginSuccess from '@/app/session/userLoginSuccess';
import { default as clearLoading } from '@/shared/ui/button-loading/clearLoading';
import { default as setLoading } from '@/shared/ui/button-loading/setLoading';
import { authApi } from '@/shared/api/apiService';
import { resetTokenState } from '@/shared/api/token/tokenErneuern';
import type { CustomHTMLDivElement } from '@/types';
import { schliesseModal } from '@/components';

/**
 * Meldet den Benutzer über das Login-Modal an: fehlende Zugangsdaten kommen aus `#Benutzer`/
 * `#Passwort`, bei Erfolg folgt `userLoginSuccess`. Fehler erscheinen in `#errorMessage`; offline
 * wird ohne API-Aufruf abgebrochen.
 *
 * @param modal - Login-Modal mit den Eingabefeldern.
 * @param username - Vorgegebener Benutzername; sonst der Wert aus `#Benutzer`.
 * @param passwort - Vorgegebenes Passwort; sonst der Wert aus `#Passwort`.
 * @throws {Error} Wenn ein Eingabefeld oder `#errorMessage` fehlt.
 */
export default async function loginUser(
  modal: CustomHTMLDivElement,
  username?: string,
  passwort?: string,
): Promise<void> {
  const usernameInput = modal.querySelector<HTMLInputElement>('#Benutzer');
  if (!usernameInput) throw new Error('Benutzer Input nicht gefunden');
  username ??= usernameInput.value;

  const passwortInput = modal.querySelector<HTMLInputElement>('#Passwort');
  if (!passwortInput) throw new Error('Passwort Input nicht gefunden');
  passwort ??= passwortInput.value;

  setLoading('btnLogin');
  setLoading('btnLoginModal');

  const errorMessage = document.querySelector<HTMLDivElement>('#errorMessage');
  if (!errorMessage) throw new Error('Error Nachrichtenfeld nicht gefunden');

  if (!navigator.onLine) {
    errorMessage.textContent = 'Keine Internetverbindung';
    clearLoading('btnLogin', false);
    clearLoading('btnLoginModal', false);
    return;
  }

  try {
    await authApi.login(username, passwort);
    resetTokenState();
    const me = await authApi.me().catch(() => null);
    schliesseModal();
    await userLoginSuccess({ username, role: me?.role, email: me?.email, emailVerified: me?.emailVerified });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.log(err.message);
      errorMessage.innerHTML = err.message;
    } else {
      console.log(err);
      errorMessage.innerHTML = String(err);
    }
  } finally {
    clearLoading('btnLogin', false);
    clearLoading('btnLoginModal', false);
  }
}
