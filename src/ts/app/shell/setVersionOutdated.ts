import { createSnackBar } from '@/shared/ui/snackbar/CustomSnackbar';
import { setDisableButton } from '@/shared/ui/button-loading/buttonDisable';

/**
 * Meldet eine neue App-Version: sperrt die Buttons und zeigt eine dauerhafte Meldung mit Aktualisieren-Knopf.
 *
 * @param updateSW - Service-Worker-Update; wird mit `true` (Seite danach neu laden) aufgerufen.
 */
export default function setVersionOutdated(updateSW: (reloadPage?: boolean) => Promise<void>): void {
  setDisableButton(true);
  createSnackBar({
    message: 'Eine neue App-Version ist verfügbar.',
    dismissible: false,
    status: 'warning',
    timeout: false,
    position: 'tc',
    fixed: true,
    actions: [{ text: 'Jetzt aktualisieren', function: () => void updateSW(true), dismiss: false }],
  });
}
