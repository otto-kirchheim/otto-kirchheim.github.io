import { createSnackBar } from '../../../class/CustomSnackbar';
import { createModalResetPassword } from '../components';

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

export default function handleAuthUrlState(): void {
  const url = new URL(window.location.href);
  const verifyState = url.searchParams.get('verify');
  const verifyReason = url.searchParams.get('reason');
  const resetPasswordToken = url.searchParams.get('resetPasswordToken');

  let mutated = false;

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
}
