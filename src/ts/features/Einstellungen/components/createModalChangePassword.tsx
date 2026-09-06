import { createRef, type SubmitEvent } from 'react';

import { MyFormModal, MyInput, MyModalBody, PasswordStrengthMeter, showModal } from '@/components';
import { PASSWORD_MIN_LENGTH } from '@/infrastructure/validation/passwordValidation';
import { checkPasswort } from '../utils';

export default function createModalChangePassword(): void {
  const ref = createRef<HTMLFormElement>();
  const passwortRef = createRef<HTMLInputElement>();

  const modal = showModal(
    <MyFormModal myRef={ref} title="Passwort Ändern" submitText="Speichern" onSubmit={onSubmit()}>
      <MyModalBody>
        <MyInput
          divClass="form-floating col-12"
          required
          type="password"
          id="PasswortAlt"
          name="Altes Passwort"
          autoComplete="current-password"
        >
          Altes Passwort
        </MyInput>
        <div className="col-12 border rounded p-2">
          <p className="text-muted small fw-semibold text-uppercase mb-2 ps-1">Neues Passwort</p>
          <div className="row g-2">
            <MyInput
              myRef={passwortRef}
              divClass="form-floating col-12"
              required
              type="password"
              id="PasswortNeu"
              name="Neues Passwort"
              minLength={PASSWORD_MIN_LENGTH}
              autoComplete="new-password"
              invalidFeedbackId="change-password-new-feedback"
              invalidFeedbackText="Das neue Passwort muss mindestens 8 Zeichen lang sein."
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
              id="PasswortNeu2"
              name="Neues Passwort wiederholen"
              minLength={PASSWORD_MIN_LENGTH}
              autoComplete="new-password"
              invalidFeedbackId="change-password-repeat-feedback"
              invalidFeedbackText="Bitte wiederhole das neue Passwort mit mindestens 8 Zeichen."
              popover={{
                content: '-Mindestens 8 Zeichen <br/>',
                placement: 'right',
                html: true,
                title: 'Hinweis',
                trigger: 'focus',
              }}
            >
              Neues Passwort wiederholen
            </MyInput>
          </div>
        </div>
      </MyModalBody>
    </MyFormModal>,
  );

  if (ref.current === null) throw new Error('referenz nicht gesetzt');
  const form = ref.current;

  function onSubmit(): (event: SubmitEvent<HTMLFormElement>) => void {
    return (event: SubmitEvent<HTMLFormElement>): void => {
      if (!(form instanceof HTMLFormElement)) return;
      event.preventDefault();
      form.classList.add('was-validated');
      if (form.checkValidity && !form.checkValidity()) return;
      checkPasswort(modal);
    };
  }
}
