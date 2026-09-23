import { browserSupportsWebAuthn, startAuthentication } from '@simplewebauthn/browser';
import { invokeHook } from '@/shared/lib/feature';
import { default as clearLoading } from '@/shared/ui/button-loading/clearLoading';
import { default as setLoading } from '@/shared/ui/button-loading/setLoading';
import { authApi } from '@/shared/api/apiService';
import { getPasskeyErrorMessage } from '@/shared/api/token/passkeys';
import { resetTokenState } from '@/shared/api/token/tokenErneuern';
import type { CustomHTMLDivElement } from '@/types';
import { schliesseModal } from '@/components';

/**
 * Meldet per Passkey (WebAuthn) an. Der Benutzername im Login-Dialog ist optional (ohne ihn
 * löst der Server über den Passkey auf). Bei Erfolg wird der Dialog geschlossen und
 * `userLoginSuccess` gestartet; Fehler erscheinen im Feld `#errorMessage`.
 *
 * @param modal - Login-Dialog mit dem Eingabefeld `#Benutzer`.
 * @throws {Error} Wenn `#Benutzer` oder `#errorMessage` im DOM fehlen.
 */
export default async function loginWithPasskey(modal: CustomHTMLDivElement): Promise<void> {
  const usernameInput = modal.querySelector<HTMLInputElement>('#Benutzer');
  const errorMessage = document.querySelector<HTMLDivElement>('#errorMessage');

  if (!usernameInput) throw new Error('Benutzer Input nicht gefunden');
  if (!errorMessage) throw new Error('Error Nachrichtenfeld nicht gefunden');

  const userName = usernameInput.value.trim() || undefined;

  if (!browserSupportsWebAuthn()) {
    errorMessage.textContent = 'Dieser Browser unterstützt keine Biometrie-Anmeldung.';
    return;
  }

  setLoading('btnLogin');

  try {
    const { options, challengeToken, userName: resolvedUserName } = await authApi.beginPasskeyLogin(userName);
    const credential = await startAuthentication({
      optionsJSON: options,
      // Der Button-Klick soll die native Passkey-Abfrage sofort öffnen. Conditional UI /
      // Autofill über das Input-Feld darf den expliziten Login-Flow nicht still blockieren.
      useBrowserAutofill: false,
    });
    await authApi.finishPasskeyLogin(credential, challengeToken, userName ?? resolvedUserName);
    resetTokenState();

    const me = await authApi.me().catch(() => null);
    const effectiveUserName = me?.userName ?? userName ?? resolvedUserName ?? '';
    schliesseModal();
    await invokeHook('auth:login-success', {
      username: effectiveUserName,
      role: me?.role,
      email: me?.email,
      emailVerified: me?.emailVerified,
    });
  } catch (error) {
    errorMessage.textContent = getPasskeyErrorMessage(error, 'Biometrie-Anmeldung fehlgeschlagen');
  } finally {
    clearLoading('btnLogin', false);
  }
}
