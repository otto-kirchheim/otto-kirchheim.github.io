import { createRef, type SubmitEvent } from 'react';

import MyFormModal from '@/shared/ui/modal/MyFormModal';
import MyInput from '@/shared/ui/form/MyInput';
import MyModalBody from '@/shared/ui/modal/MyModalBody';
import PasswordStrengthMeter from '@/shared/ui/form/PasswordStrengthMeter';
import showModal from '@/shared/ui/modal/showModal';
import { PASSWORD_MIN_LENGTH } from '@/shared/lib/validation/passwordValidation';
import { checkPasswort } from '../model';

/**
 * Öffnet das Modal zum Ändern des Passworts (altes Passwort, neues Passwort mit Stärke-Anzeige und Wiederholung). Nach gültiger Formularprüfung übernimmt `checkPasswort` das Absenden.
 */
export default function createModalChangePassword(): void {
  const ref = createRef<HTMLFormElement>();
  const passwortRef = createRef<HTMLInputElement>();

  const modal = showModal(
    <MyFormModal myRef={ref} title="Passwort Ändern" submitText="Speichern" onSubmit={onSubmit()}>
      <MyModalBody>
        <MyInput
          divClass="sp-12"
          required
          type="password"
          id="PasswortAlt"
          name="Altes Passwort"
          autoComplete="current-password"
        >
          Altes Passwort
        </MyInput>
        <div className="border p-2">
          <p className="text-muted small fw-semibold text-uppercase mb-2 ps-1">Neues Passwort</p>
          <div className="raster abstand-2">
            <MyInput
              myRef={passwortRef}
              divClass="sp-12"
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
              divClass="sp-12"
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

  /**
   * Erzeugt den Submit-Handler: unterdrückt das Standard-Submit, bricht bei ungültigem Formular ab und ruft sonst `checkPasswort`.
   *
   * @returns Submit-Handler des Formulars.
   */
  function onSubmit(): (event: SubmitEvent<HTMLFormElement>) => void {
    return (event: SubmitEvent<HTMLFormElement>): void => {
      if (!(form instanceof HTMLFormElement)) return;
      event.preventDefault();
      if (form.checkValidity && !form.checkValidity()) return;
      checkPasswort(modal);
    };
  }
}
