import { createRef, type SubmitEvent } from 'react';

import { MyFormModal, MyInput, MyModalBody, PasswordStrengthMeter, showModal } from '@/components';
import { PASSWORD_MIN_LENGTH } from '@/shared/lib/validation/passwordValidation';
import { checkNeuerBenutzer } from '../model';

/**
 * Öffnet den Registrierungsdialog (Zugangscode, Benutzer, E-Mail, zweimal Passwort mit Stärkeanzeige).
 */
export default function createModalNewUser(): void {
  const ref = createRef<HTMLFormElement>();
  const passwortRef = createRef<HTMLInputElement>();

  showModal(
    <MyFormModal myRef={ref} title="Neuen Benutzer Erstellen" submitText="Erstellen" onSubmit={onSubmit()}>
      <MyModalBody>
        <MyInput
          divClass="sp-12"
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
          divClass="sp-12"
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
          divClass="sp-12"
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
        <div className="border p-2">
          <p className="text-muted small fw-semibold text-uppercase mb-2 ps-1">Passwort</p>
          <div className="raster abstand-2">
            <MyInput
              myRef={passwortRef}
              divClass="sp-12"
              required
              type="password"
              id="Passwort"
              name="Passwort"
              minLength={PASSWORD_MIN_LENGTH}
              autoComplete="new-password"
              invalidFeedbackId="register-password-feedback"
              invalidFeedbackText="Das Passwort muss mindestens 8 Zeichen lang sein."
              popover={{
                content: '-Mindestens 8 Zeichen <br/>',
                placement: 'right',
                html: true,
                title: 'Hinweis',
                trigger: 'focus',
              }}
            >
              Passwort
            </MyInput>
            <PasswordStrengthMeter passwordInputRef={passwortRef} />
            <MyInput
              divClass="sp-12"
              required
              type="password"
              id="Passwort2"
              name="Passwort wiederholen"
              minLength={PASSWORD_MIN_LENGTH}
              autoComplete="new-password"
              invalidFeedbackId="register-password-repeat-feedback"
              invalidFeedbackText="Bitte wiederhole das Passwort mit mindestens 8 Zeichen."
              popover={{
                content: '-Mindestens 8 Zeichen <br/>',
                placement: 'right',
                html: true,
                title: 'Hinweis',
                trigger: 'focus',
              }}
            >
              Passwort wiederholen
            </MyInput>
          </div>
        </div>
      </MyModalBody>
    </MyFormModal>,
  );

  if (ref.current === null) throw new Error('referenz nicht gesetzt');
  const form = ref.current;

  /**
   * Baut den Submit-Handler: verhindert den Standard-Submit und ruft bei gültigem Formular `checkNeuerBenutzer` auf.
   */
  function onSubmit(): (event: SubmitEvent<HTMLFormElement>) => void {
    return (event: SubmitEvent<HTMLFormElement>): void => {
      if (!(form instanceof HTMLFormElement)) return;
      event.preventDefault();
      if (form.checkValidity && !form.checkValidity()) return;
      checkNeuerBenutzer();
    };
  }
}
