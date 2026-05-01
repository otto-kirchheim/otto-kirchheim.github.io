import Modal from 'bootstrap/js/dist/modal';
import { browserSupportsWebAuthn, startAuthentication } from '@simplewebauthn/browser';
import { userLoginSuccess } from '.';
import { default as clearLoading } from '@/infrastructure/ui/clearLoading';
import { default as setLoading } from '@/infrastructure/ui/setLoading';
import { authApi } from '@/infrastructure/api/apiService';
import { getPasskeyErrorMessage } from '@/infrastructure/tokenManagement/passkeys';
import { resetTokenState } from '@/infrastructure/tokenManagement/tokenErneuern';
import type { CustomHTMLDivElement } from '@/types';

export default async function loginWithPasskey(modal: CustomHTMLDivElement): Promise<void> {
  const usernameInput = modal.querySelector<HTMLInputElement>('#Benutzer');
  const errorMessage = document.querySelector<HTMLDivElement>('#errorMessage');
  const btnLogin = document.querySelector<HTMLButtonElement>('#btnLogin');

  if (!usernameInput) throw new Error('Benutzer Input nicht gefunden');
  if (!errorMessage) throw new Error('Error Nachrichtenfeld nicht gefunden');

  const userName = usernameInput.value.trim() || undefined;

  if (!browserSupportsWebAuthn()) {
    errorMessage.textContent = 'Dieser Browser unterstützt keine Biometrie-Anmeldung.';
    return;
  }

  if (btnLogin) btnLogin.disabled = true;
  setLoading('btnLogin');

  try {
    const { options, challengeToken, userName: resolvedUserName } = await authApi.beginPasskeyLogin(userName);
    const credential = await startAuthentication({
      optionsJSON: options,
      // Der Button-klick soll die native Passkey-Abfrage sofort öffnen.
      // Conditional UI / Autofill über das Input-Feld bleibt separat möglich,
      // darf aber den expliziten Login-Flow nicht still blockieren.
      useBrowserAutofill: false,
    });
    await authApi.finishPasskeyLogin(credential, challengeToken, userName ?? resolvedUserName);
    resetTokenState();

    const me = await authApi.me().catch(() => null);
    const effectiveUserName = me?.userName ?? userName ?? resolvedUserName ?? '';
    Modal.getInstance(modal)?.hide();
    await userLoginSuccess({
      username: effectiveUserName,
      role: me?.role,
      email: me?.email,
      emailVerified: me?.emailVerified,
    });
  } catch (error) {
    errorMessage.textContent = getPasskeyErrorMessage(error, 'Biometrie-Anmeldung fehlgeschlagen');
  } finally {
    clearLoading('btnLogin', false);
    if (btnLogin) btnLogin.disabled = false;
  }
}
