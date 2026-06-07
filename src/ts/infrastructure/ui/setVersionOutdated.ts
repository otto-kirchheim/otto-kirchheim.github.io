import { createSnackBar } from './CustomSnackbar';
import { setDisableButton } from './buttonDisable';

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
