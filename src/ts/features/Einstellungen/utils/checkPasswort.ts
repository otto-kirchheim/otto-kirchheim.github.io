import Modal from 'bootstrap/js/dist/modal';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import type { CustomHTMLDivElement } from '@/types';
import { default as clearLoading } from '@/infrastructure/ui/clearLoading';
import { default as setLoading } from '@/infrastructure/ui/setLoading';
import { authApi } from '@/infrastructure/api/apiService';
import { getPasswordValidationMessage } from '@/infrastructure/validation/passwordValidation';

export default async function checkPasswort(modal: CustomHTMLDivElement): Promise<void> {
  const errorMessage = modal.querySelector<HTMLDivElement>('#errorMessage');
  if (!errorMessage) throw new Error('Fehler: errorMessage nicht gefunden!');

  const passwortAltInput = modal.querySelector<HTMLInputElement>('#PasswortAlt');
  if (!passwortAltInput) throw new Error('Fehler: PasswortAlt InputElement nicht gefunden!');
  const PasswortAlt = passwortAltInput.value.trim();

  const passwortNewInput = modal.querySelector<HTMLInputElement>('#PasswortNeu');
  if (!passwortNewInput) throw new Error('Fehler: PasswortNeu InputElement nicht gefunden!');
  const PasswortNeu = passwortNewInput.value.trim();

  const passwortNew2Input = modal.querySelector<HTMLInputElement>('#PasswortNeu2');
  if (!passwortNew2Input) throw new Error('Fehler: PasswortNeu2 InputElement nicht gefunden!');
  const PasswortNeu2 = passwortNew2Input.value.trim();

  if (!PasswortAlt) {
    errorMessage.textContent = 'Bitte Aktuelles Passwort Eingeben';
    return;
  }
  if (!PasswortNeu) {
    errorMessage.textContent = 'Bitte Neues Passwort Eingeben';
    return;
  }
  if (!PasswortNeu2) {
    errorMessage.textContent = 'Bitte Neues Passwort wiederholen';
    return;
  }

  const passwordError = getPasswordValidationMessage(PasswortNeu, 'Das neue Passwort');
  if (passwordError) {
    errorMessage.textContent = passwordError;
    return;
  }

  if (PasswortNeu != PasswortNeu2) {
    errorMessage.textContent = 'Passwort falsch wiederholt';
    return;
  }
  if (PasswortAlt == PasswortNeu) {
    errorMessage.textContent = 'Passwörter Alt und Neu sind gleich';
    return;
  }

  if (!navigator.onLine) {
    errorMessage.textContent = 'Keine Internetverbindung';
    return;
  }

  setLoading('btnChange');

  try {
    await authApi.changePassword(PasswortAlt, PasswortNeu);
    Modal.getInstance(modal)?.hide();

    createSnackBar({
      message: `Passwort wurde geändert.`,
      status: 'success',
      timeout: 3000,
      fixed: true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(msg);
    errorMessage.textContent = msg;
    createSnackBar({
      message: `Passwort konnte nicht geändert werden.`,
      status: 'error',
      timeout: 3000,
      fixed: true,
    });
  } finally {
    clearLoading('btnChange');
  }
}
