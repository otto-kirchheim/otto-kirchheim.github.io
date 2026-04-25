import { createSnackBar } from '../ui/CustomSnackbar';
import { setDisableButton } from './buttonDisable';
import { invokeHook } from '../../core/hooks';

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
