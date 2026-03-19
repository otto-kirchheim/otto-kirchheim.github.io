import Modal from 'bootstrap/js/dist/modal';
import { createRef } from 'preact';
import { MyFormModal, MyInput, MyModalBody, showModal } from '../../components';
import { createSnackBar } from '../../class/CustomSnackbar';
import { authApi } from '../../utilities/apiService';

export default function createModalForgotPassword(): void {
  const ref = createRef<HTMLFormElement>();

  const modal = showModal(
    <MyFormModal myRef={ref} title="Passwort vergessen" submitText="Reset-Link senden" onSubmit={onSubmit()}>
      <MyModalBody>
        <MyInput
          required
          type="email"
          id="EmailReset"
          name="E-Mail"
          pattern={new RegExp(/^[A-Za-z0-9._%+-]+@deutschebahn\.com$/).source}
          autoComplete="email"
        >
          E-Mail (@deutschebahn.com)
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

      const emailInput = modal.querySelector<HTMLInputElement>('#EmailReset');
      if (!emailInput) throw new Error('E-Mail Input nicht gefunden');

      if (!navigator.onLine) {
        errorMessage.textContent = 'Keine Internetverbindung';
        return;
      }

      try {
        await authApi.forgotPassword(emailInput.value.trim());
        Modal.getInstance(modal)?.hide();
        createSnackBar({
          message: 'Falls die E-Mail verifiziert registriert ist, wurde ein Reset-Link versendet.',
          status: 'success',
          timeout: 4000,
          fixed: true,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errorMessage.innerHTML = msg;
      }
    };
  }
}
