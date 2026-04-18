import { createRef } from 'preact';
import { MyFormModal, MyInput, MyModalBody, showModal } from '../../../components';
import { PASSWORD_MIN_LENGTH } from '../../../infrastructure/validation/passwordValidation';
import { checkNeuerBenutzer } from '../utils';

export default function createModalNewUser(): void {
  const ref = createRef<HTMLFormElement>();

  const modal = showModal(
    <MyFormModal myRef={ref} title="Neuen Benutzer Erstellen" submitText="Erstellen" onSubmit={onSubmit()}>
      <MyModalBody>
        <MyInput
          required
          type="text"
          id="Zugang"
          name="Zugangscode"
          pattern={new RegExp(/[A-Za-z]*/).source}
          autoComplete="off"
        >
          Zugangscode
        </MyInput>
        <MyInput
          required
          type="text"
          id="Benutzer"
          name="Benutzer"
          pattern={new RegExp(/^[A-Za-z0-9.\-+_%]*$/).source}
          autoComplete="off"
          popover={{
            content: 'Erlaubt: Buchstaben, Zahlen und Zeichen .-+_% (kein Ää Öö Üü ß)',
            placement: 'right',
            trigger: 'focus',
          }}
        >
          Benutzer
        </MyInput>
        <MyInput
          required
          type="email"
          id="Email"
          name="E-Mail"
          pattern={new RegExp(/^[A-Za-z0-9._%+-]+@deutschebahn\.com$/).source}
          autoComplete="email"
          popover={{
            content: 'Nur @deutschebahn.com E-Mail-Adressen erlaubt',
            placement: 'right',
            trigger: 'focus',
          }}
        >
          E-Mail (@deutschebahn.com)
        </MyInput>
        <MyInput
          required
          type="password"
          id="Passwort"
          name="Passwort"
          pattern={new RegExp(/^[A-Za-z0-9.\-+_%]*$/).source}
          minLength={PASSWORD_MIN_LENGTH}
          autoComplete="new-password"
          invalidFeedbackId="register-password-feedback"
          invalidFeedbackText="Das Passwort muss mindestens 8 Zeichen lang sein und darf nur erlaubte Zeichen enthalten."
          popover={{
            content:
              '-Mindestens 8 Zeichen <br/>-Große Buchstaben <br/>-Kleine Buchstaben <br/>-Zahlen <br/>-Zeichen: .-+_% <br/>',
            placement: 'right',
            html: true,
            title: 'Erlaubte Zeichen',
            trigger: 'focus',
          }}
        >
          Passwort
        </MyInput>
        <MyInput
          required
          type="password"
          id="Passwort2"
          name="Passwort wiederholen"
          pattern={new RegExp(/^[A-Za-z0-9.\-+_%]*$/).source}
          minLength={PASSWORD_MIN_LENGTH}
          autoComplete="new-password"
          invalidFeedbackId="register-password-repeat-feedback"
          invalidFeedbackText="Bitte wiederhole das Passwort mit mindestens 8 erlaubten Zeichen."
          popover={{
            content:
              '-Mindestens 8 Zeichen <br/>-Große Buchstaben <br/>-Kleine Buchstaben <br/>-Zahlen <br/>-Zeichen: .-+_% <br/>',
            placement: 'right',
            html: true,
            title: 'Erlaubte Zeichen',
            trigger: 'focus',
          }}
        >
          Passwort wiederholen
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
      checkNeuerBenutzer(modal);
    };
  }
}
