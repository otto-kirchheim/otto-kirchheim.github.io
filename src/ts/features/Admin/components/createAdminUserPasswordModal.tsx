import { createRef, type SubmitEvent } from 'react';

import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { MyFormModal, MyInput, MyModalBody, PasswordStrengthMeter, schliesseModal, showModal } from '@/components';
import { updateUserPassword } from '../utils/api';

export default function createAdminUserPasswordModal(userId: string, userName: string): void {
  const ref = createRef<HTMLFormElement>();
  const passwortRef = createRef<HTMLInputElement>();

  const modal = showModal(
    <MyFormModal myRef={ref} title={`Passwort setzen: ${userName}`} submitText="Passwort setzen" onSubmit={onSubmit()}>
      <MyModalBody>
        <div className="col-12">
          <p className="small text-body-secondary mb-0">
            Das Passwort wird direkt für diesen Benutzer gesetzt. Der Benutzer muss sich danach mit dem neuen Passwort
            anmelden.
          </p>
        </div>
        <MyInput
          myRef={passwortRef}
          divClass="form-floating col-12"
          required
          type="password"
          id="adminUserPasswordNew"
          name="Neues Passwort"
          autoComplete="new-password"
          popover={{
            content: '-Mindestens 8 Zeichen <br/>',
            placement: 'right',
            html: true,
            title: 'Hinweis',
            trigger: 'focus',
          }}
        >
          Neues Passwort
        </MyInput>
        <PasswordStrengthMeter passwordInputRef={passwortRef} />
        <MyInput
          divClass="form-floating col-12"
          required
          type="password"
          id="adminUserPasswordRepeat"
          name="Neues Passwort wiederholen"
          autoComplete="new-password"
        >
          Neues Passwort wiederholen
        </MyInput>
      </MyModalBody>
    </MyFormModal>,
  );

  if (ref.current === null) throw new Error('referenz nicht gesetzt');
  const form = ref.current;

  function onSubmit(): (event: SubmitEvent<HTMLFormElement>) => Promise<void> {
    return async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
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

      const newPassword = passwordInput.value;
      const repeatedPassword = repeatInput.value;

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
        schliesseModal();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errorMessage.textContent = msg;
        createSnackBar({ message: 'Passwort konnte nicht gesetzt werden', status: 'error', timeout: 3000 });
      }
    };
  }
}
