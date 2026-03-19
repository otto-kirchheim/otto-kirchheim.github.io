import Modal from 'bootstrap/js/dist/modal';
import { createSnackBar } from '../../class/CustomSnackbar';
import { clearLoading } from '../../utilities';
import { authApi } from '../../utilities/apiService';
import userLoginSuccess from './userLoginSuccess';
import type { CustomHTMLDivElement } from '../../interfaces';

export default async function checkNeuerBenutzer(modal: CustomHTMLDivElement): Promise<void> {
  const errorMessage = document.querySelector<HTMLDivElement>('#errorMessage');
  if (!errorMessage) throw new Error('errorMessage not found');

  const zugangscode = document.querySelector<HTMLInputElement>('#Zugang');
  if (!zugangscode) {
    errorMessage.textContent = 'Bitte Zugangscode Eingeben';
    return;
  }
  const benutzer = document.querySelector<HTMLInputElement>('#Benutzer');
  if (!benutzer) {
    errorMessage.textContent = 'Bitte Benutzername Eingeben';
    return;
  }

  const email = document.querySelector<HTMLInputElement>('#Email');
  if (!email) {
    errorMessage.textContent = 'Bitte E-Mail Eingeben';
    return;
  }

  const passwort1 = document.querySelector<HTMLInputElement>('#Passwort');
  if (!passwort1) {
    errorMessage.textContent = 'Bitte Passwort Eingeben';
    return;
  }
  const passwort2 = document.querySelector<HTMLInputElement>('#Passwort2');
  if (!passwort2) {
    errorMessage.textContent = 'Bitte Passwort wiederholen';
    return;
  }
  if (passwort1.value !== passwort2.value) {
    errorMessage.textContent = 'Passwörter falsch wiederholt';
    return;
  }

  if (!navigator.onLine) {
    errorMessage.textContent = 'Keine Internetverbindung';
    return;
  }

  try {
    await authApi.register(benutzer.value.trim(), email.value.trim(), passwort1.value.trim(), zugangscode.value.trim());
    const me = await authApi.me().catch(() => null);

    Modal.getInstance(modal)?.hide();

    createSnackBar({
      message: `Benutzer erfolgreich angelegt.`,
      status: 'success',
      timeout: 3000,
      fixed: true,
    });

    await userLoginSuccess({
      username: benutzer.value.trim(),
      role: me?.role,
      email: me?.email,
      emailVerified: me?.emailVerified,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(msg);
    errorMessage.innerHTML = msg;
    createSnackBar({
      message: `Fehler bei Benutzerstellung: </br>${msg}`,
      status: 'error',
      timeout: 3000,
      fixed: true,
    });
  } finally {
    clearLoading('btnNeu');
  }
}
