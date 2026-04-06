import { createRef } from 'preact';
import { MyFormModal, MyInput, MyModalBody, showModal } from '../../components';
import { PASSWORD_MIN_LENGTH } from '../../utilities/passwordValidation';
import { checkPasswort } from '../utils';

export default function createModalChangePassword(): void {
  const ref = createRef<HTMLFormElement>();

  const modal = showModal(
    <MyFormModal myRef={ref} size="sm" title="Passwort Ändern" submitText="Speichern" onSubmit={onSubmit()}>
      <MyModalBody>
        <MyInput
          required
          type="password"
          id="PasswortAlt"
          name="Altes Passwort"
          pattern={new RegExp(/^[A-Za-z0-9.\-+_%]*$/).source}
          autoComplete="current-password"
        >
          Altes Passwort
        </MyInput>
        <MyInput
          required
          type="password"
          id="PasswortNeu"
          name="Neues Passwort"
          pattern={new RegExp(/^[A-Za-z0-9.\-+_%]*$/).source}
          minLength={PASSWORD_MIN_LENGTH}
          autoComplete="new-password"
          invalidFeedbackId="change-password-new-feedback"
          invalidFeedbackText="Das neue Passwort muss mindestens 8 Zeichen lang sein und darf nur erlaubte Zeichen enthalten."
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
          id="PasswortNeu2"
          name="Neues Passwort wiederholen"
          pattern={new RegExp(/^[A-Za-z0-9.\-+_%]*$/).source}
          minLength={PASSWORD_MIN_LENGTH}
          autoComplete="new-password"
          invalidFeedbackId="change-password-repeat-feedback"
          invalidFeedbackText="Bitte wiederhole das neue Passwort mit mindestens 8 erlaubten Zeichen."
          popover={{
            content:
              '-Mindestens 8 Zeichen <br/>-Große Buchstaben <br/>-Kleine Buchstaben <br/>-Zahlen <br/>-Zeichen: .-+_% <br/>',
            placement: 'right',
            html: true,
            title: 'Erlaubte Zeichen',
            trigger: 'focus',
          }}
        >
          Neues Passwort wiederholen
        </MyInput>
      </MyModalBody>
    </MyFormModal>,
  );

  if (ref.current === null) throw new Error('referenz nicht gesetzt');
  const form = ref.current;

  function onSubmit(): (event: Event) => void {
    return (event: Event): void => {
      if (!(form instanceof HTMLFormElement)) return;
      event.preventDefault();
      form.classList.add('was-validated');
      if (form.checkValidity && !form.checkValidity()) return;
      checkPasswort(modal);
    };
  }
}
