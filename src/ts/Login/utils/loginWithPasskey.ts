import Modal from 'bootstrap/js/dist/modal';
import { browserSupportsWebAuthn, startAuthentication, WebAuthnError } from '@simplewebauthn/browser';
import { userLoginSuccess } from '.';
import { clearLoading, setLoading } from '../../utilities';
import { authApi } from '../../utilities/apiService';
import { resetTokenState } from '../../utilities/tokenErneuern';
import type { CustomHTMLDivElement } from '../../interfaces';

function getPasskeyErrorMessage(error: unknown): string {
  if (error instanceof WebAuthnError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Passkey-Anmeldung fehlgeschlagen';
}

export default async function loginWithPasskey(modal: CustomHTMLDivElement): Promise<void> {
  const usernameInput = modal.querySelector<HTMLInputElement>('#Benutzer');
  const errorMessage = document.querySelector<HTMLDivElement>('#errorMessage');
  const btnLogin = document.querySelector<HTMLButtonElement>('#btnLogin');

  if (!usernameInput) throw new Error('Benutzer Input nicht gefunden');
  if (!errorMessage) throw new Error('Error Nachrichtenfeld nicht gefunden');

  const userName = usernameInput.value.trim() || undefined;

  if (!browserSupportsWebAuthn()) {
    errorMessage.textContent = 'Dieser Browser unterstützt keine Passkeys.';
    return;
  }

  if (btnLogin) btnLogin.disabled = true;
  setLoading('btnLogin');

  try {
    const { options, challengeToken, userName: resolvedUserName } = await authApi.beginPasskeyLogin(userName);
    const credential = await startAuthentication({
      optionsJSON: options,
      useBrowserAutofill: !userName,
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
    errorMessage.textContent = getPasskeyErrorMessage(error);
  } finally {
    clearLoading('btnLogin', false);
    if (btnLogin) btnLogin.disabled = false;
  }
}
