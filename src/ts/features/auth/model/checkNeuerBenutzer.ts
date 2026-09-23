import { createSnackBar } from '@/shared/ui/snackbar/CustomSnackbar';
import { confirmDialog } from '@/shared/ui/dialog/confirmDialog';
import { default as clearLoading } from '@/shared/ui/button-loading/clearLoading';
import { authApi } from '@/shared/api/apiService';
import { registerPasskeyWithResult } from '@/shared/api/token/passkeys';
import { getPasswordValidationMessage } from '@/shared/lib/validation/passwordValidation';
import { resetTokenState } from '@/shared/api/token/tokenErneuern';
import { invokeHook } from '@/shared/lib/feature';
import { schliesseModal } from '@/shared/ui/modal/showModal';

/**
 * Bietet nach der Registrierung die Passkey-Einrichtung an, sofern der Browser `PublicKeyCredential` kennt.
 * Bei einem Fehler wird erneut angeboten; Ende bei Erfolg, "unsupported", "cancelled" oder wenn der Nutzer nicht wiederholen will.
 */
async function maybeSetupPasskeyAfterSignup(): Promise<void> {
  if (typeof PublicKeyCredential === 'undefined') {
    return;
  }

  const wantsPasskey = await confirmDialog(
    'Benutzer erfolgreich angelegt. Möchtest du jetzt direkt einen Passkey für zukünftige Logins einrichten?',
    {
      title: 'Passkey einrichten',
      confirmLabel: 'Ja',
      cancelLabel: 'Nein',
      confirmVariant: 'brand',
      confirmColor: undefined,
    },
  );

  if (!wantsPasskey) {
    return;
  }

  while (true) {
    const result = await registerPasskeyWithResult();

    if (result.ok || result.reason === 'unsupported' || result.reason === 'cancelled') {
      return;
    }

    const retry = await confirmDialog(`${result.message}\n\nPasskey-Einrichtung erneut versuchen?`, {
      title: 'Passkey-Fehler',
      confirmLabel: 'Erneut versuchen',
      confirmVariant: 'brand',
      confirmColor: undefined,
    });
    if (!retry) {
      return;
    }
  }
}

/**
 * Liest die Felder des Registrierungsdialogs aus dem DOM, validiert sie und legt den Benutzer über die API an.
 * Danach: Passkey-Angebot, Dialog schließen, Login abschließen und Ersteinrichtung einmalig öffnen. Fehler landen in `#errorMessage` und einer Snackbar; der Lade-Zustand von `btnNeu` wird immer beendet.
 *
 * @throws {Error} Wenn `#errorMessage` im DOM fehlt.
 */
export default async function checkNeuerBenutzer(): Promise<void> {
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

  const passwordError = getPasswordValidationMessage(passwort1.value, 'Das Passwort');
  if (passwordError) {
    errorMessage.textContent = passwordError;
    return;
  }

  if (!navigator.onLine) {
    errorMessage.textContent = 'Keine Internetverbindung';
    return;
  }

  try {
    await authApi.register(benutzer.value.trim(), email.value.trim(), passwort1.value, zugangscode.value.trim());
    resetTokenState();
    const me = await authApi.me().catch(() => null);

    await maybeSetupPasskeyAfterSignup();

    schliesseModal();

    createSnackBar({
      message: 'Benutzer erfolgreich angelegt.',
      status: 'success',
      timeout: 3000,
      fixed: true,
    });

    await invokeHook('auth:login-success', {
      username: benutzer.value.trim(),
      role: me?.role,
      email: me?.email,
      emailVerified: me?.emailVerified,
    });

    invokeHook('onboarding:open-once');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(msg);
    errorMessage.textContent = msg;
    createSnackBar({
      message: 'Fehler bei Benutzerstellung.',
      status: 'error',
      timeout: 3000,
      fixed: true,
    });
  } finally {
    clearLoading('btnNeu');
  }
}
