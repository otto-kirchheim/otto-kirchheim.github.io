import { createSnackBar } from '../ui/CustomSnackbar';
import { setDisableButton } from './buttonDisable';
import { invokeHook } from '@/shared/lib/feature';

/**
 * Schaltet die App in den Offline-Zustand: sperrt die Buttons und zeigt eine dauerhafte Meldung. Sobald der Browser
 * wieder online ist (einmalig), werden die Buttons freigegeben, der Hook `network:reconnect` ausgeloest und die
 * Meldung durch eine kurze Online-Meldung ersetzt.
 */
export default function setOffline(): void {
  setDisableButton(true);
  const offlineSnackbar = createSnackBar({
    message: 'Du bist offline',
    icon: '!',
    dismissible: false,
    status: 'error',
    timeout: false,
    position: 'tc',
    fixed: true,
  });

  /** Einmaliger `online`-Handler: hebt den Offline-Zustand wieder auf. */
  const onlineHandler = () => {
    setDisableButton(false);
    invokeHook('network:reconnect');
    offlineSnackbar.Close();
    createSnackBar({
      message: 'Du bist wieder online',
      dismissible: false,
      timeout: 2000,
      position: 'tc',
      fixed: true,
    });
  };

  window.addEventListener('online', onlineHandler, { once: true });
}
