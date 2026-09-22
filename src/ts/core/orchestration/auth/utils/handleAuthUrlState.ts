import { FetchRetry } from '@/shared/api/FetchRetry';
import { createSnackBar } from '@/shared/ui/snackbar/CustomSnackbar';
import { createModalResetPassword } from '../components';

/**
 * Übersetzt den `reason`-Code einer Verifizierungs-Weiterleitung in eine Benutzermeldung.
 *
 * @param reason - Backend-Code (`VERIFY_TOKEN_EXPIRED`, `VERIFY_TOKEN_INVALID`) oder `null`.
 * @returns Meldungstext; unbekannte Codes und `null` ergeben die allgemeine Fehlermeldung.
 */
function mapVerifyReason(reason: string | null): string {
  switch (reason) {
    case 'VERIFY_TOKEN_EXPIRED':
      return 'Der Verifizierungs-Link ist abgelaufen. Bitte fordere eine neue E-Mail an.';
    case 'VERIFY_TOKEN_INVALID':
      return 'Der Verifizierungs-Link ist ungueltig.';
    default:
      return 'Die E-Mail-Verifizierung konnte nicht abgeschlossen werden.';
  }
}

/**
 * Entfernt Query-Parameter per `history.replaceState` aus der Adresszeile, ohne Seitenwechsel.
 *
 * @param names - Namen der zu entfernenden Parameter.
 */
function removeSearchParams(...names: string[]): void {
  const url = new URL(window.location.href);
  for (const name of names) url.searchParams.delete(name);
  window.history.replaceState({}, '', url.toString());
}

/**
 * Löst die E-Mail-Verifizierung per Token aus der URL aus und meldet das Ergebnis per Snackbar.
 * Der Parameter wird nur bei einem definitiven Ergebnis entfernt (Erfolg oder Token-Fehler),
 * nie bei transienten Fehlern, damit der nächste Ladevorgang es erneut versucht.
 *
 * @param token - Wert von `verifyEmailToken`.
 */
async function verifyEmailFromUrl(token: string): Promise<void> {
  try {
    const response = await FetchRetry<undefined, null>(`auth/verify-email/${token}`);
    if (response instanceof Error) throw response;

    if (response.success) {
      createSnackBar({
        message: 'E-Mail erfolgreich verifiziert.',
        status: 'success',
        timeout: 5000,
        fixed: true,
      });
      removeSearchParams('verifyEmailToken');
      return;
    }

    // 426 = Frontend veraltet: Param behalten, damit die Verifizierung nach dem
    // PWA-Update + Reload automatisch erneut versucht wird (Update-Hook läuft bereits).
    if (response.statusCode === 426) return;

    // Definitiver Token-Fehler (ungültig/abgelaufen): Param entfernen, Meldung zeigen.
    createSnackBar({
      message: response.message ?? mapVerifyReason(null),
      status: 'error',
      timeout: 7000,
      fixed: true,
    });
    removeSearchParams('verifyEmailToken');
  } catch (error) {
    // Transient (offline, Server nicht erreichbar, Version veraltet): Param behalten,
    // damit der nächste Laden-Vorgang die Verifizierung erneut anstößt.
    console.error('E-Mail-Verifizierung fehlgeschlagen (transient):', error);
  }
}

/**
 * Wertet Auth-Parameter der URL aus: Verifizierungs-Ergebnis (`verify`/`reason`), Passwort-Reset
 * (`resetPasswordToken`, öffnet den Reset-Dialog) und E-Mail-Verifizierung (`verifyEmailToken`).
 * Verbrauchte Parameter werden aus der Adresszeile entfernt.
 */
export default function handleAuthUrlState(): void {
  const url = new URL(window.location.href);
  const verifyState = url.searchParams.get('verify');
  const verifyReason = url.searchParams.get('reason');
  const resetPasswordToken = url.searchParams.get('resetPasswordToken');
  const verifyEmailToken = url.searchParams.get('verifyEmailToken');

  let mutated = false;

  // Legacy: Redirect-Antwort eines alten Backends (Deploy-Übergang).
  if (verifyState === 'success') {
    createSnackBar({
      message: 'E-Mail erfolgreich verifiziert.',
      status: 'success',
      timeout: 5000,
      fixed: true,
    });
    url.searchParams.delete('verify');
    url.searchParams.delete('reason');
    mutated = true;
  }

  if (verifyState === 'error') {
    createSnackBar({
      message: mapVerifyReason(verifyReason),
      status: 'error',
      timeout: 7000,
      fixed: true,
    });
    url.searchParams.delete('verify');
    url.searchParams.delete('reason');
    mutated = true;
  }

  if (resetPasswordToken) {
    createModalResetPassword(resetPasswordToken);
    url.searchParams.delete('resetPasswordToken');
    mutated = true;
  }

  if (mutated) {
    window.history.replaceState({}, '', url.toString());
  }

  // Erst nach dem synchronen Param-Cleanup starten (entfernt seinen Param selbst).
  if (verifyEmailToken) {
    void verifyEmailFromUrl(verifyEmailToken);
  }
}
