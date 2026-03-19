import Modal from 'bootstrap/js/dist/modal';
import { userLoginSuccess } from '.';
import { clearLoading, setLoading } from '../../utilities';
import { authApi } from '../../utilities/apiService';
import { resetTokenState } from '../../utilities/tokenErneuern';
import type { CustomHTMLDivElement } from '../../interfaces';

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

  const btnLogin = document.querySelector<HTMLButtonElement>('#btnLogin');
  if (btnLogin) btnLogin.disabled = true;
  setLoading('btnLogin');

  const errorMessage = document.querySelector<HTMLDivElement>('#errorMessage');
  if (!errorMessage) throw new Error('Error Nachrichtenfeld nicht gefunden');

  if (!navigator.onLine) {
    errorMessage.textContent = 'Keine Internetverbindung';
    clearLoading('btnLogin', false);
    return;
  }

  try {
    await authApi.login(username, passwort);
    resetTokenState();
    const me = await authApi.me().catch(() => null);
    Modal.getInstance(modal)?.hide();
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
  }
}
