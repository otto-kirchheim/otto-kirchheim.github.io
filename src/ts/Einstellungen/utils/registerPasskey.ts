import { browserSupportsWebAuthn, startRegistration, WebAuthnError } from '@simplewebauthn/browser';
import { createSnackBar } from '../../class/CustomSnackbar';
import { authApi } from '../../utilities/apiService';

function getPasskeyErrorMessage(error: unknown): string {
  if (error instanceof WebAuthnError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Passkey konnte nicht eingerichtet werden';
}

function guessDeviceName(): string {
  const userAgent = navigator.userAgent;

  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'Apple-Gerät';
  if (/Android/i.test(userAgent)) return 'Android-Gerät';
  if (/Macintosh|Mac OS X/i.test(userAgent)) return 'Mac';
  if (/Windows/i.test(userAgent)) return 'Windows-PC';
  if (/Linux/i.test(userAgent)) return 'Linux-Gerät';
  return 'Dieses Gerät';
}

export default async function registerPasskey(): Promise<boolean> {
  if (!browserSupportsWebAuthn()) {
    createSnackBar({
      message: 'Dieser Browser unterstützt keine Passkeys.',
      status: 'warning',
      timeout: 4000,
      fixed: true,
    });
    return false;
  }

  try {
    const options = await authApi.beginPasskeyRegistration();
    const credential = await startRegistration({ optionsJSON: options });
    await authApi.finishPasskeyRegistration(credential, guessDeviceName());

    createSnackBar({
      message:
        'Passkey erfolgreich registriert. Fingerprint, Face ID oder Geräte-PIN kann jetzt für den Login genutzt werden.',
      status: 'success',
      timeout: 5000,
      fixed: true,
    });
    return true;
  } catch (error) {
    createSnackBar({
      message: getPasskeyErrorMessage(error),
      status: 'danger',
      timeout: 5000,
      fixed: true,
    });
    return false;
  }
}
