import { DBButton, DBDivider, DBInfotext, DBStack } from '@db-ux/react-core-components';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { createRef, type SubmitEvent } from 'react';

import { loginUser, loginWithPasskey } from '../model';
import DBLoadingButton from '@/shared/ui/button-loading/DBLoadingButton';
import MyFormModal from '@/shared/ui/modal/MyFormModal';
import MyInput from '@/shared/ui/form/MyInput';
import MyModalBody from '@/shared/ui/modal/MyModalBody';
import { Gruppe } from '@/shared/ui/gruppe/Gruppe';
import showModal from '@/shared/ui/modal/showModal';
import { createModalForgotPassword, createModalNewUser } from '.';
import type { CustomHTMLDivElement } from '@/types';

/**
 * Öffnet den Login-Dialog mit Benutzer/Passwort sowie Links zu "Passwort vergessen" und "Registrieren".
 * Wenn der Browser WebAuthn unterstützt, gibt es "Mit Passkey" (Benutzername darf dann leer bleiben). Das Modal-Element gibt es erst nach `showModal`, daher hält `currentModal` es für den Passkey-Button vor.
 */
export default function createModalLogin(): void {
  let currentModal: CustomHTMLDivElement | null = null;

  const ref = createRef<HTMLFormElement>();
  const supportsPasskeys = browserSupportsWebAuthn();

  const footer = (
    <div className="dialog-fuss login-fuss">
      <DBStack direction="row" justifyContent="center" className="login-fuss__bereich login-fuss__bereich--oben">
        <DBLoadingButton variant="brand" type="submit" id="btnLoginModal">
          Einloggen
        </DBLoadingButton>
      </DBStack>

      {supportsPasskeys && (
        <div className="login-fuss__bereich login-fuss__bereich--oben login-fuss__bereich--unten">
          <Gruppe titel="Alternative Anmeldung">
            <DBStack gap="x-small" alignment="center">
              <DBInfotext showIcon={false}>
                Mit einem gespeicherten Passkey kann der Benutzername leer bleiben – der Browser zeigt dann passende
                Geräte an.
              </DBInfotext>
              <DBButton
                variant="outlined"
                type="button"
                onClick={() => {
                  if (currentModal) void loginWithPasskey(currentModal);
                }}
              >
                Mit Passkey
              </DBButton>
            </DBStack>
          </Gruppe>
        </div>
      )}

      {!supportsPasskeys && <DBDivider width="full" />}

      <DBStack
        direction="row"
        alignment="center"
        justifyContent="space-between"
        wrap
        className="login-fuss__bereich login-fuss__bereich--unten"
      >
        <DBInfotext showIcon={false}>Weitere Optionen</DBInfotext>
        <DBStack direction="row" wrap gap="x-small">
          <DBButton
            variant="outlined"
            type="button"
            data-dialog-dismiss="modal"
            onClick={() => createModalForgotPassword()}
          >
            Passwort vergessen
          </DBButton>
          <DBButton
            variant="outlined"
            data-color="informational"
            type="button"
            data-dialog-dismiss="modal"
            onClick={() => createModalNewUser()}
          >
            Registrieren
          </DBButton>
          <DBButton variant="filled" type="button" data-dialog-dismiss="modal">
            Abbrechen
          </DBButton>
        </DBStack>
      </DBStack>
    </div>
  );

  const modal = showModal(
    <MyFormModal myRef={ref} title="Einloggen" submitText="Einloggen" onSubmit={onSubmit()} Footer={footer}>
      <MyModalBody>
        <MyInput
          divClass="sp-12"
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
          divClass="sp-12"
          required
          type="password"
          id="Passwort"
          name="Passwort"
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

  /**
   * Baut den Submit-Handler: bei gültigem Formular wird der Standard-Submit verhindert und `loginUser` mit dem Modal aufgerufen.
   */
  function onSubmit(): (event: SubmitEvent<HTMLFormElement>) => void {
    return (event: SubmitEvent<HTMLFormElement>): void => {
      if (!(form instanceof HTMLFormElement)) return;
      if (form.checkValidity && !form.checkValidity()) return;
      event.preventDefault();
      loginUser(modal);
    };
  }
}
