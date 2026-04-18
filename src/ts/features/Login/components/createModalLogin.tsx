import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { createRef } from 'preact';
import { loginUser, loginWithPasskey } from '../utils';
import { MyButton, MyFormModal, MyInput, MyModalBody, showModal } from '../../../components';
import { createModalForgotPassword, createModalNewUser } from '.';
import type { CustomHTMLDivElement } from '../../../interfaces';

export default function createModalLogin(): void {
  let currentModal: CustomHTMLDivElement | null = null;

  const ref = createRef<HTMLFormElement>();
  const supportsPasskeys = browserSupportsWebAuthn();

  const footer = (
    <div className="modal-footer flex-column align-items-stretch gap-0 p-0">
      <div className="d-flex justify-content-center gap-2 w-100 px-3 pt-3">
        <MyButton className="btn btn-primary" type="submit" text="Einloggen" id="btnLoginModal" />
      </div>

      {supportsPasskeys && (
        <div className="w-100 px-3 p-3">
          <div className="border rounded-3 px-3 py-2 bg-body-tertiary">
            <div className="small fw-semibold text-uppercase text-body-secondary mb-1">Alternative Anmeldung</div>
            <p className="small text-body-secondary mb-2">
              Mit einem gespeicherten Passkey kann der Benutzername leer bleiben – der Browser zeigt dann passende
              Geräte an.
            </p>
            <div className="d-flex justify-content-center gap-2">
              <MyButton
                className="btn btn-outline-primary"
                type="button"
                text="Mit Passkey"
                clickHandler={() => {
                  if (currentModal) void loginWithPasskey(currentModal);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {!supportsPasskeys && <hr className="w-100 my-3 mx-0 border-secondary-subtle opacity-100" />}

      <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 w-100 px-3 pb-3">
        <span className="small text-body-secondary">Weitere Optionen</span>
        <div className="d-grid d-sm-flex gap-2">
          <MyButton
            className="btn btn-outline-secondary"
            type="button"
            dataBsDismiss="modal"
            text="Passwort vergessen"
            clickHandler={() => createModalForgotPassword()}
          />
          <MyButton
            className="btn btn-outline-info"
            type="button"
            dataBsDismiss="modal"
            text="Registrieren"
            clickHandler={() => createModalNewUser()}
          />
          <MyButton className="btn btn-secondary" type="button" dataBsDismiss="modal" text="Abbrechen" />
        </div>
      </div>
    </div>
  );

  const modal = showModal(
    <MyFormModal myRef={ref} title="Einloggen" submitText="Einloggen" onSubmit={onSubmit()} Footer={footer}>
      <MyModalBody>
        <MyInput
          required
          type="text"
          id="Benutzer"
          name="benutzer"
          pattern={new RegExp(/^[A-Za-z0-9.\-+_%]*$/).source}
          autoComplete="username webauthn"
        >
          Benutzer
        </MyInput>
        <MyInput
          required
          type="password"
          id="Passwort"
          name="Passwort"
          pattern={new RegExp(/^[A-Za-z0-9.\-+_%]*$/).source}
          autoComplete="current-password"
        >
          Passwort
        </MyInput>
      </MyModalBody>
    </MyFormModal>,
  );

  currentModal = modal;

  if (ref.current === null) throw new Error('referenz nicht gesetzt');
  const form = ref.current;

  function onSubmit(): (event: Event) => void {
    return (event: Event): void => {
      if (!(form instanceof HTMLFormElement)) return;
      if (form.checkValidity && !form.checkValidity()) return;
      event.preventDefault();
      loginUser(modal);
    };
  }
}
