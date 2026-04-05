import { createRef } from 'preact';
import { loginUser, loginWithPasskey } from '../utils';
import { MyButton, MyFormModal, MyInput, MyModalBody, showModal } from '../../components';
import { createModalForgotPassword, createModalNewUser } from '.';
import type { CustomHTMLDivElement } from '../../interfaces';

export default function createModalLogin(): void {
  let currentModal: CustomHTMLDivElement | null = null;

  const customFooterButtton = [
    <MyButton
      key="Passwort vergessen"
      className="btn btn-warning"
      type="button"
      dataBsDismiss="modal"
      text="Passwort vergessen"
      clickHandler={() => createModalForgotPassword()}
    />,
    <MyButton
      key="Registrieren"
      className="btn btn-info"
      type="button"
      dataBsDismiss="modal"
      text="Registrieren"
      clickHandler={() => createModalNewUser()}
    />,
    <MyButton
      key="Mit Passkey"
      className="btn btn-outline-primary"
      type="button"
      text="Mit Passkey"
      clickHandler={() => {
        if (currentModal) void loginWithPasskey(currentModal);
      }}
    />,
  ];

  const ref = createRef<HTMLFormElement>();

  const modal = showModal(
    <MyFormModal
      myRef={ref}
      title="Einloggen"
      submitText="Einloggen"
      onSubmit={onSubmit()}
      customButtons={customFooterButtton}
    >
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
        >
          Passwort
        </MyInput>
        <p className="small text-body-secondary mb-0">
          Für „Mit Passkey“ kann der Benutzername leer bleiben – der Browser zeigt dann gespeicherte Passkeys an.
        </p>
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
