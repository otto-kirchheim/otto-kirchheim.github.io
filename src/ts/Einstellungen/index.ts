import { Storage, saveDaten } from '../utilities';
import { authApi } from '../utilities/apiService';
import { createSnackBar } from '../class/CustomSnackbar';
import { createModalChangePassword } from './components';
import {
  Logout,
  SelectYear,
  changeMonatJahr,
  generateEingabeMaskeEinstellungen,
  generateEingabeTabelleEinstellungenVorgabenB,
} from './utils';

async function ensureEmailAnzeigeLoaded(): Promise<void> {
  const emailInput = document.querySelector<HTMLInputElement>('#EmailAnzeige');
  const resendButton = document.querySelector<HTMLButtonElement>('#btnResendVerificationEmail');
  const verificationHint = document.querySelector<HTMLElement>('#EmailVerificationHint');

  if (!emailInput) return;

  const storedEmail = Storage.get<string>('BenutzerEmail', { default: '' });
  if (storedEmail) {
    emailInput.value = storedEmail;
    if (resendButton) resendButton.disabled = true;
    if (verificationHint) verificationHint.textContent = 'Verifizierungsstatus wird geladen...';
  }

  const me = await authApi.me().catch(() => null);

  if (me?.email) {
    Storage.set('BenutzerEmail', me.email);
    emailInput.value = me.email;
  }

  if (!resendButton || !verificationHint) return;

  if (!me?.email) {
    resendButton.hidden = true;
    verificationHint.textContent = 'E-Mail aktuell nicht verfügbar.';
    return;
  }

  if (me.emailVerified === false) {
    resendButton.hidden = false;
    resendButton.disabled = false;
    verificationHint.textContent = 'E-Mail ist noch nicht verifiziert.';
    return;
  }

  resendButton.hidden = true;
  verificationHint.textContent = 'E-Mail ist verifiziert.';
}

async function resendVerificationEmailFromSettings(): Promise<void> {
  const resendButton = document.querySelector<HTMLButtonElement>('#btnResendVerificationEmail');
  const emailInput = document.querySelector<HTMLInputElement>('#EmailAnzeige');

  if (!resendButton) return;

  const email = emailInput?.value?.trim();
  if (!email) {
    createSnackBar({
      message: 'Keine E-Mail für den Versand verfügbar.',
      status: 'warning',
      timeout: 4000,
      fixed: true,
    });
    return;
  }

  resendButton.disabled = true;
  const originalText = resendButton.textContent;
  resendButton.textContent = 'Sende...';

  try {
    await authApi.resendVerificationEmail(email);
    createSnackBar({
      message: 'Falls erforderlich, wurde eine neue Verifizierungs-E-Mail versendet.',
      status: 'info',
      timeout: 4000,
      fixed: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Versand fehlgeschlagen';
    createSnackBar({
      message,
      status: 'danger',
      timeout: 5000,
      fixed: true,
    });
  } finally {
    resendButton.textContent = originalText;
    await ensureEmailAnzeigeLoaded();
  }
}

window.addEventListener('load', () => {
  const Monat = document.querySelector<HTMLInputElement>('#Monat');
  Monat?.addEventListener('change', changeMonatJahr);

  const Jahr = document.querySelector<HTMLInputElement>('#Jahr');
  Jahr?.addEventListener('change', changeMonatJahr);

  const formSelectMonatJahr = document.querySelector<HTMLFormElement>('#formSelectMonatJahr');
  formSelectMonatJahr?.addEventListener('submit', e => {
    e.preventDefault();
    SelectYear();
  });

  const btnPasswortAEndern = document.querySelector<HTMLButtonElement>('#btnPasswortAEndern');
  btnPasswortAEndern?.addEventListener('click', createModalChangePassword);

  const btnResendVerificationEmail = document.querySelector<HTMLButtonElement>('#btnResendVerificationEmail');
  btnResendVerificationEmail?.addEventListener('click', () => {
    void resendVerificationEmailFromSettings();
  });

  const btnLogout = document.querySelector<HTMLButtonElement>('#btnLogout');
  btnLogout?.addEventListener('click', Logout);

  const form = document.querySelector<HTMLFormElement>('#formEinstellungen');
  const saveButton = document.querySelector<HTMLButtonElement>('#btnSaveEinstellungen');

  if (form && saveButton)
    form.addEventListener('submit', event => {
      event.stopPropagation();
      event.preventDefault();
      saveDaten(saveButton);
    });

  if (Storage.check('VorgabenU')) generateEingabeMaskeEinstellungen();
  else generateEingabeTabelleEinstellungenVorgabenB({});

  const einstellungenTab = document.querySelector<HTMLButtonElement>('#einstellungen-tab');
  einstellungenTab?.addEventListener('click', () => {
    if (Storage.check('Benutzer')) void ensureEmailAnzeigeLoaded();
  });

  if (Storage.check('Benutzer')) void ensureEmailAnzeigeLoaded();
});
