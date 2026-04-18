import { createSnackBar } from '../../class/CustomSnackbar';
import { setDisableButton } from './buttonDisable';

let reconnectHandler: (() => void) | null = null;

/** Register a handler to be called when the app comes back online. */
export function setOnReconnectHandler(handler: () => void): void {
  reconnectHandler = handler;
}

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

  const onlineHandler = () => {
    setDisableButton(false);
    reconnectHandler?.();
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
