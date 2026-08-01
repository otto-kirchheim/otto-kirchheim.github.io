import Modal from 'bootstrap/js/dist/modal';
import { createRef } from 'preact';
import { browserSupportsWebAuthn, startAuthentication } from '@simplewebauthn/browser';
import { MyFormModal, MyInput, MyModalBody, PasswordStrengthMeter, showModal } from '@/components';
import { authApi } from '@/infrastructure/api/apiService';
import { getUserCookie } from '@/infrastructure/tokenManagement/decodeAccessToken';
import { getPasskeyErrorMessage } from '@/infrastructure/tokenManagement/passkeys';
import { resetTokenState } from '@/infrastructure/tokenManagement/tokenErneuern';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { PASSWORD_MIN_LENGTH, getPasswordValidationMessage } from '@/infrastructure/validation/passwordValidation';

/**
 * Passwort neu setzen ohne altes Passwort: die Identität wird stattdessen
 * über eine frische Passkey-Assertion (Fingerprint/Face ID/PIN) nachgewiesen.
 */
export default function createModalPasskeySetPassword(): void {
  const ref = createRef<HTMLFormElement>();
  const passwortRef = createRef<HTMLInputElement>();

  const modal = showModal(
    <MyFormModal
      myRef={ref}
      size="sm"
      title="Passwort per Passkey neu setzen"
      submitText="Passwort setzen"
      onSubmit={onSubmit()}
    >
      <MyModalBody>
        <div className="col-12">
          <p className="small text-body-secondary mb-0">
            Du bestätigst die Änderung mit deinem Passkey (Fingerprint, Face ID oder Geräte-PIN) – dein altes Passwort
            wird nicht benötigt. Andere Sitzungen werden abgemeldet.
          </p>
        </div>
        <MyInput
          myRef={passwortRef}
          divClass="form-floating col-12"
          required
          type="password"
          id="PasskeyPasswortNeu"
          name="Neues Passwort"
          minLength={PASSWORD_MIN_LENGTH}
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
          id="PasskeyPasswortNeu2"
          name="Neues Passwort wiederholen"
          minLength={PASSWORD_MIN_LENGTH}
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
      event.preventDefault();
      form.classList.add('was-validated');
      if (form.checkValidity && !form.checkValidity()) return;

      const errorMessage = modal.querySelector<HTMLSpanElement>('#errorMessage');
      const passwordInput = modal.querySelector<HTMLInputElement>('#PasskeyPasswortNeu');
      const repeatInput = modal.querySelector<HTMLInputElement>('#PasskeyPasswortNeu2');

      if (!errorMessage || !passwordInput || !repeatInput) {
        throw new Error('Passkey-Passwort-Dialog konnte nicht initialisiert werden');
      }

      errorMessage.textContent = '';

      const newPassword = passwordInput.value;
      const repeatedPassword = repeatInput.value;

      const passwordError = getPasswordValidationMessage(newPassword, 'Das neue Passwort');
      if (passwordError) {
        errorMessage.textContent = passwordError;
        return;
      }

      if (newPassword !== repeatedPassword) {
        errorMessage.textContent = 'Passwörter stimmen nicht überein';
        return;
      }

      if (!browserSupportsWebAuthn()) {
        errorMessage.textContent = 'Dieser Browser unterstützt keine Biometrie-Anmeldung.';
        return;
      }

      if (!navigator.onLine) {
        errorMessage.textContent = 'Keine Internetverbindung';
        return;
      }

      const userName = getUserCookie()?.userName;
      if (!userName) {
        errorMessage.textContent = 'Benutzer konnte nicht ermittelt werden. Bitte neu anmelden.';
        return;
      }

      try {
        const { options, challengeToken } = await authApi.beginPasskeyLogin(userName);
        const credential = await startAuthentication({ optionsJSON: options, useBrowserAutofill: false });
        await authApi.setPasswordWithPasskey(credential, challengeToken, newPassword);
        resetTokenState();

        Modal.getInstance(modal)?.hide();
        createSnackBar({
          message: 'Passwort wurde neu gesetzt.',
          status: 'success',
          timeout: 3000,
          fixed: true,
        });
      } catch (error: unknown) {
        errorMessage.textContent = getPasskeyErrorMessage(error, 'Passwort konnte nicht gesetzt werden');
      }
    };
  }
}
