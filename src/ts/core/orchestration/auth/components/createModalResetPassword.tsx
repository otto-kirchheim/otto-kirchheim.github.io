import Modal from 'bootstrap/js/dist/modal';
import { createRef } from 'preact';
import { MyFormModal, MyInput, MyModalBody, showModal } from '../../../../components';
import { createSnackBar } from '../../../../class/CustomSnackbar';
import { authApi } from '../../../../infrastructure/api/apiService';
import {
  getPasswordValidationMessage,
  PASSWORD_MIN_LENGTH,
} from '../../../../infrastructure/validation/passwordValidation';

export default function createModalResetPassword(token: string): void {
  const ref = createRef<HTMLFormElement>();

  const modal = showModal(
    <MyFormModal myRef={ref} title="Passwort zurücksetzen" submitText="Passwort speichern" onSubmit={onSubmit()}>
      <MyModalBody>
        <MyInput
          required
          type="password"
          id="PasswortNeuReset"
          name="Neues Passwort"
          pattern={new RegExp(/^[A-Za-z0-9.\-+_%]*$/).source}
          minLength={PASSWORD_MIN_LENGTH}
          autoComplete="new-password"
          invalidFeedbackId="reset-password-new-feedback"
          invalidFeedbackText="Das neue Passwort muss mindestens 8 Zeichen lang sein und darf nur erlaubte Zeichen enthalten."
          popover={{
            content: '-Mindestens 8 Zeichen <br/>-Zeichen: .-+_% <br/>',
            placement: 'right',
            html: true,
            title: 'Passwort-Regeln',
            trigger: 'focus',
          }}
        >
          Neues Passwort
        </MyInput>
        <MyInput
          required
          type="password"
          id="PasswortNeuReset2"
          name="Neues Passwort wiederholen"
          pattern={new RegExp(/^[A-Za-z0-9.\-+_%]*$/).source}
          minLength={PASSWORD_MIN_LENGTH}
          autoComplete="new-password"
          invalidFeedbackId="reset-password-repeat-feedback"
          invalidFeedbackText="Bitte wiederhole das neue Passwort mit mindestens 8 erlaubten Zeichen."
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
      event.preventDefault();
      form.classList.add('was-validated');
      if (form.checkValidity && !form.checkValidity()) return;

      const errorMessage = document.querySelector<HTMLDivElement>('#errorMessage');
      if (!errorMessage) throw new Error('Error Nachrichtenfeld nicht gefunden');
      errorMessage.textContent = '';

      const passwordInput = modal.querySelector<HTMLInputElement>('#PasswortNeuReset');
      const passwordRepeatInput = modal.querySelector<HTMLInputElement>('#PasswortNeuReset2');
      if (!passwordInput || !passwordRepeatInput) throw new Error('Passwort Inputs nicht gefunden');

      const newPassword = passwordInput.value.trim();
      const repeatedPassword = passwordRepeatInput.value.trim();

      if (newPassword !== repeatedPassword) {
        errorMessage.textContent = 'Passwörter stimmen nicht überein';
        return;
      }

      const passwordError = getPasswordValidationMessage(newPassword, 'Das neue Passwort');
      if (passwordError) {
        errorMessage.textContent = passwordError;
        return;
      }

      if (!navigator.onLine) {
        errorMessage.textContent = 'Keine Internetverbindung';
        return;
      }

      try {
        await authApi.resetPassword(token, newPassword);
        Modal.getInstance(modal)?.hide();
        createSnackBar({
          message: 'Passwort wurde erfolgreich zurückgesetzt. Bitte melde dich erneut an.',
          status: 'success',
          timeout: 5000,
          fixed: true,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errorMessage.textContent = msg;
      }
    };
  }
}
