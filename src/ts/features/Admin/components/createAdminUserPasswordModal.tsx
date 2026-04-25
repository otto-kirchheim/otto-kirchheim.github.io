import Modal from 'bootstrap/js/dist/modal';
import { createRef } from 'preact';
import { createSnackBar } from '../../../infrastructure/ui/CustomSnackbar';
import { MyFormModal, MyInput, MyModalBody, showModal } from '../../../components';
import { updateUserPassword } from '../utils/api';

const PASSWORD_PATTERN = new RegExp(/^[A-Za-z0-9.\-+_%]*$/).source;

export default function createAdminUserPasswordModal(userId: string, userName: string): void {
  const ref = createRef<HTMLFormElement>();

  const modal = showModal(
    <MyFormModal
      myRef={ref}
      size="sm"
      title={`Passwort setzen: ${userName}`}
      submitText="Passwort setzen"
      onSubmit={onSubmit()}
    >
      <MyModalBody>
        <p className="small text-body-secondary mb-1">
          Das Passwort wird direkt für diesen Benutzer gesetzt. Der Benutzer muss sich danach mit dem neuen Passwort
          anmelden.
        </p>
        <MyInput
          required
          type="password"
          id="adminUserPasswordNew"
          name="Neues Passwort"
          pattern={PASSWORD_PATTERN}
          autoComplete="new-password"
          popover={{
            content:
              '-Mindestens 8 Zeichen <br/>-Große Buchstaben <br/>-Kleine Buchstaben <br/>-Zahlen <br/>-Zeichen: .-+_% <br/>',
            placement: 'right',
            html: true,
            title: 'Erlaubte Zeichen',
            trigger: 'focus',
          }}
        >
          Neues Passwort
        </MyInput>
        <MyInput
          required
          type="password"
          id="adminUserPasswordRepeat"
          name="Neues Passwort wiederholen"
          pattern={PASSWORD_PATTERN}
          autoComplete="new-password"
        >
          Neues Passwort wiederholen
        </MyInput>
      </MyModalBody>
    </MyFormModal>,
  );

  if (ref.current === null) throw new Error('referenz nicht gesetzt');
  const form = ref.current;

  function onSubmit(): (event: Event) => Promise<void> {
    return async (event: Event): Promise<void> => {
      if (!(form instanceof HTMLFormElement)) return;
      if (form.checkValidity && !form.checkValidity()) return;
      event.preventDefault();

      const errorMessage = modal.querySelector<HTMLSpanElement>('#errorMessage');
      const passwordInput = modal.querySelector<HTMLInputElement>('#adminUserPasswordNew');
      const repeatInput = modal.querySelector<HTMLInputElement>('#adminUserPasswordRepeat');

      if (!errorMessage || !passwordInput || !repeatInput) {
        throw new Error('Passwort-Dialog konnte nicht initialisiert werden');
      }

      errorMessage.textContent = '';

      const newPassword = passwordInput.value.trim();
      const repeatedPassword = repeatInput.value.trim();

      if (newPassword.length < 8) {
        errorMessage.textContent = 'Das neue Passwort muss mindestens 8 Zeichen lang sein';
        return;
      }

      if (newPassword !== repeatedPassword) {
        errorMessage.textContent = 'Passwörter stimmen nicht überein';
        return;
      }

      if (!navigator.onLine) {
        errorMessage.textContent = 'Keine Internetverbindung';
        return;
      }

      try {
        await updateUserPassword(userId, newPassword);
        Modal.getInstance(modal)?.hide();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errorMessage.textContent = msg;
        createSnackBar({ message: 'Passwort konnte nicht gesetzt werden', status: 'error', timeout: 3000 });
      }
    };
  }
}
