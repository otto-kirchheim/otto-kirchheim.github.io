import Modal from 'bootstrap/js/dist/modal';
import { createRef } from 'preact';
import { MyFormModal, MyInput, MyModalBody, showModal } from '../../components';
import { createSnackBar } from '../../class/CustomSnackbar';
import { authApi } from '../../utilities/apiService';

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
          autoComplete="new-password"
        >
          Neues Passwort
        </MyInput>
        <MyInput
          required
          type="password"
          id="PasswortNeuReset2"
          name="Neues Passwort wiederholen"
          pattern={new RegExp(/^[A-Za-z0-9.\-+_%]*$/).source}
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

      const errorMessage = document.querySelector<HTMLDivElement>('#errorMessage');
      if (!errorMessage) throw new Error('Error Nachrichtenfeld nicht gefunden');
      errorMessage.textContent = '';

      const passwordInput = modal.querySelector<HTMLInputElement>('#PasswortNeuReset');
      const passwordRepeatInput = modal.querySelector<HTMLInputElement>('#PasswortNeuReset2');
      if (!passwordInput || !passwordRepeatInput) throw new Error('Passwort Inputs nicht gefunden');

      if (passwordInput.value !== passwordRepeatInput.value) {
        errorMessage.textContent = 'Passwörter stimmen nicht überein';
        return;
      }

      if (!navigator.onLine) {
        errorMessage.textContent = 'Keine Internetverbindung';
        return;
      }

      try {
        await authApi.resetPassword(token, passwordInput.value.trim());
        Modal.getInstance(modal)?.hide();
        createSnackBar({
          message: 'Passwort wurde erfolgreich zurückgesetzt. Bitte melde dich erneut an.',
          status: 'success',
          timeout: 5000,
          fixed: true,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errorMessage.innerHTML = msg;
      }
    };
  }
}
