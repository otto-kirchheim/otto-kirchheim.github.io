import { browserSupportsWebAuthn, startRegistration, WebAuthnError } from '@simplewebauthn/browser';
import { createSnackBar } from '../ui/CustomSnackbar';
import { authApi } from '../api/apiService';

export type PasskeyRegistrationResult = {
  ok: boolean;
  reason: 'success' | 'unsupported' | 'cancelled' | 'error';
  message: string;
};

type RegisterPasskeyOptions = {
  successMessage?: string;
  unsupportedMessage?: string;
  cancelledMessage?: string;
  errorFallbackMessage?: string;
  showSuccessToast?: boolean;
  showFailureToast?: boolean;
  showCancelledToast?: boolean;
  showUnsupportedToast?: boolean;
};

/**
 * Erkennt einen vom Nutzer abgebrochenen WebAuthn-Vorgang (`AbortError`).
 *
 * @param error - Gefangener Fehler.
 * @returns `true` bei `AbortError` (als `DOMException` oder `Error`).
 */
function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

/**
 * Liefert eine anzeigbare Meldung zu einem Passkey-Fehler.
 *
 * @param error - Gefangener Fehler.
 * @param fallback - Meldung, wenn der Fehler keinen Text mitbringt.
 * @returns Abbruch-Hinweis bei `AbortError`, sonst die Fehlermeldung, sonst `fallback`.
 */
export function getPasskeyErrorMessage(
  error: unknown,
  fallback = 'Biometrie-Anmeldung konnte nicht eingerichtet werden',
): string {
  if (isAbortError(error)) {
    return 'Vorgang wurde abgebrochen.';
  }

  if (error instanceof WebAuthnError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/**
 * Rät anhand des User-Agents einen Gerätenamen für den neuen Passkey.
 *
 * @returns Grober Gerätename (z. B. `'Mac'`, `'Android-Gerät'`); `'Dieses Gerät'`, wenn unbekannt.
 */
export function guessPasskeyDeviceName(): string {
  const userAgent = navigator.userAgent;

  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'Apple-Gerät';
  if (/Android/i.test(userAgent)) return 'Android-Gerät';
  if (/Macintosh|Mac OS X/i.test(userAgent)) return 'Mac';
  if (/Windows/i.test(userAgent)) return 'Windows-PC';
  if (/Linux/i.test(userAgent)) return 'Linux-Gerät';
  return 'Dieses Gerät';
}

/**
 * Registriert einen Passkey für den angemeldeten Nutzer (Options vom Server, WebAuthn-Dialog,
 * Abschluss am Server) und meldet das Ergebnis als Wert statt per Exception. Snackbars sind je Fall
 * abschaltbar, die Texte überschreibbar.
 *
 * @param options - Meldungstexte (`successMessage`, `unsupportedMessage`, `cancelledMessage`,
 *   `errorFallbackMessage`) und die Schalter `show…Toast` (Standard: alle an).
 * @returns Ergebnis mit `ok`, Grund (`success`, `unsupported`, `cancelled`, `error`) und Meldung.
 */
export async function registerPasskeyWithResult(
  options: RegisterPasskeyOptions = {},
): Promise<PasskeyRegistrationResult> {
  const {
    successMessage = 'Biometrie-Anmeldung erfolgreich eingerichtet. Fingerprint, Face ID oder Geräte-PIN kann jetzt für den Login genutzt werden.',
    unsupportedMessage = 'Dieser Browser unterstützt keine Biometrie-Anmeldung (Passkey).',
    cancelledMessage = 'Einrichtung wurde abgebrochen. Du kannst sie später in den Einstellungen nachholen.',
    errorFallbackMessage = 'Biometrie-Anmeldung konnte nicht eingerichtet werden',
    showSuccessToast = true,
    showFailureToast = true,
    showCancelledToast = true,
    showUnsupportedToast = true,
  } = options;

  if (!browserSupportsWebAuthn()) {
    if (showUnsupportedToast) {
      createSnackBar({
        message: unsupportedMessage,
        status: 'warning',
        timeout: 4000,
        fixed: true,
      });
    }

    return {
      ok: false,
      reason: 'unsupported',
      message: unsupportedMessage,
    };
  }

  try {
    const optionsJson = await authApi.beginPasskeyRegistration();
    const credential = await startRegistration({ optionsJSON: optionsJson });
    await authApi.finishPasskeyRegistration(credential, guessPasskeyDeviceName());

    if (showSuccessToast) {
      createSnackBar({
        message: successMessage,
        status: 'success',
        timeout: 5000,
        fixed: true,
      });
    }

    return {
      ok: true,
      reason: 'success',
      message: successMessage,
    };
  } catch (error) {
    const cancelled = isAbortError(error);
    const message = cancelled ? cancelledMessage : getPasskeyErrorMessage(error, errorFallbackMessage);

    if (cancelled && showCancelledToast) {
      createSnackBar({
        message,
        status: 'warning',
        timeout: 5000,
        fixed: true,
      });
    }

    if (!cancelled && showFailureToast) {
      createSnackBar({
        message,
        status: 'danger',
        timeout: 5000,
        fixed: true,
      });
    }

    return {
      ok: false,
      reason: cancelled ? 'cancelled' : 'error',
      message,
    };
  }
}
