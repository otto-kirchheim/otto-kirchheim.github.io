import dayjs from '../utilities/configDayjs';
import { Storage, saveDaten } from '../utilities';
import { authApi } from '../utilities/apiService';
import { createSnackBar } from '../class/CustomSnackbar';
import { createModalChangePassword } from './components';
import {
  logoutUser,
  selectYear,
  changeMonatJahr,
  generateEingabeMaskeEinstellungen,
  generateEingabeTabelleEinstellungenVorgabenB,
  registerPasskey,
} from './utils';

type PasskeyListItem = Awaited<ReturnType<typeof authApi.getPasskeys>>[number];

function getPasskeyDeviceLabel(passkey: PasskeyListItem): string {
  if (passkey.deviceType === 'multiDevice') {
    return passkey.backedUp ? 'Synchronisierter Passkey' : 'Mehrgeräte-Passkey';
  }

  if (passkey.deviceType === 'singleDevice') {
    return 'Gerätegebundener Passkey';
  }

  return 'Passkey';
}

function formatPasskeyTimestamp(value?: string): string {
  if (!value) return 'noch nie';
  return dayjs(value).format('DD.MM.YYYY HH:mm');
}

function renderPasskeyList(passkeys: PasskeyListItem[]): void {
  const passkeyList = document.querySelector<HTMLElement>('#PasskeyList');
  const countBadge = document.querySelector<HTMLElement>('#PasskeyAccordionCount');

  if (countBadge) countBadge.textContent = String(passkeys.length);
  if (!passkeyList) return;

  passkeyList.replaceChildren();

  const sortedPasskeys = [...passkeys].sort(
    (left, right) =>
      dayjs(right.lastUsedAt ?? right.createdAt).valueOf() - dayjs(left.lastUsedAt ?? left.createdAt).valueOf(),
  );

  sortedPasskeys.forEach(passkey => {
    const item = document.createElement('div');
    item.className =
      'list-group-item d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3';

    const info = document.createElement('div');
    info.className = 'text-start';

    const title = document.createElement('div');
    title.className = 'fw-semibold';
    title.textContent = passkey.name;

    const badgeRow = document.createElement('div');
    badgeRow.className = 'd-flex flex-wrap gap-2 mt-2';

    const deviceBadge = document.createElement('span');
    deviceBadge.className = 'badge rounded-pill text-bg-secondary';
    deviceBadge.textContent = getPasskeyDeviceLabel(passkey);
    badgeRow.appendChild(deviceBadge);

    const backupBadge = document.createElement('span');
    backupBadge.className = `badge rounded-pill ${passkey.backedUp ? 'text-bg-success' : 'text-bg-warning'}`;
    backupBadge.textContent = passkey.backedUp ? 'Synchronisiert' : 'Nur lokal';
    badgeRow.appendChild(backupBadge);

    const meta = document.createElement('div');
    meta.className = 'small text-body-secondary mt-2';
    meta.textContent = `Zuletzt genutzt: ${formatPasskeyTimestamp(passkey.lastUsedAt)} · Hinzugefügt: ${formatPasskeyTimestamp(passkey.createdAt)}`;

    info.append(title, badgeRow, meta);

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'btn btn-outline-danger btn-sm';
    removeButton.textContent = 'Entfernen';
    removeButton.addEventListener('click', () => {
      void removePasskeyFromSettings(passkey);
    });

    item.append(info, removeButton);
    passkeyList.appendChild(item);
  });
}

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

async function removePasskeyFromSettings(passkey: PasskeyListItem): Promise<void> {
  const confirmed = window.confirm(`Passkey „${passkey.name}“ wirklich entfernen?`);
  if (!confirmed) return;

  try {
    await authApi.deletePasskey(passkey.credentialId);
    createSnackBar({
      message: `Passkey „${passkey.name}“ wurde entfernt.`,
      status: 'success',
      timeout: 4000,
      fixed: true,
    });
    await ensurePasskeyAnzeigeLoaded();
  } catch (error) {
    createSnackBar({
      message: error instanceof Error ? error.message : 'Passkey konnte nicht entfernt werden.',
      status: 'danger',
      timeout: 5000,
      fixed: true,
    });
  }
}

async function ensurePasskeyAnzeigeLoaded(): Promise<void> {
  const passkeyButton = document.querySelector<HTMLButtonElement>('#btnAddPasskey');
  const inlinePasskeyButton = document.querySelector<HTMLButtonElement>('#btnAddPasskeyInline');
  const passkeyHint = document.querySelector<HTMLElement>('#PasskeyStatus');
  const passkeyAccordionItem = document.querySelector<HTMLElement>('#PasskeysAccordionItem');

  if (!passkeyButton || !passkeyHint || !passkeyAccordionItem) return;

  if (typeof PublicKeyCredential === 'undefined') {
    passkeyButton.hidden = true;
    if (inlinePasskeyButton) inlinePasskeyButton.hidden = true;
    passkeyAccordionItem.classList.add('d-none');
    renderPasskeyList([]);
    passkeyHint.hidden = false;
    passkeyHint.textContent = 'Passkeys werden von diesem Browser nicht unterstützt.';
    return;
  }

  passkeyButton.disabled = false;
  if (inlinePasskeyButton) inlinePasskeyButton.disabled = false;

  const passkeys = await authApi.getPasskeys().catch(() => null);
  if (passkeys === null) {
    passkeyButton.hidden = false;
    if (inlinePasskeyButton) inlinePasskeyButton.hidden = true;
    passkeyAccordionItem.classList.add('d-none');
    renderPasskeyList([]);
    passkeyHint.hidden = false;
    passkeyHint.textContent = 'Passkey-Status konnte nicht geladen werden.';
    return;
  }

  if (passkeys.length === 0) {
    passkeyButton.hidden = false;
    passkeyButton.textContent = 'Passkey hinzufügen';
    if (inlinePasskeyButton) inlinePasskeyButton.hidden = true;
    passkeyAccordionItem.classList.add('d-none');
    renderPasskeyList([]);
    passkeyHint.hidden = false;
    passkeyHint.textContent = 'Noch kein Passkey registriert.';
    return;
  }

  passkeyButton.hidden = true;
  if (inlinePasskeyButton) inlinePasskeyButton.hidden = false;
  passkeyAccordionItem.classList.remove('d-none');
  renderPasskeyList(passkeys);

  const label = passkeys.length === 1 ? '1 Passkey registriert.' : `${passkeys.length} Passkeys registriert.`;
  passkeyHint.hidden = false;
  passkeyHint.textContent = label;
}

async function handlePasskeyRegistration(): Promise<void> {
  const success = await registerPasskey();
  if (success) await ensurePasskeyAnzeigeLoaded();
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
    selectYear();
  });

  const btnPasswortAEndern = document.querySelector<HTMLButtonElement>('#btnPasswortAEndern');
  btnPasswortAEndern?.addEventListener('click', createModalChangePassword);

  const btnResendVerificationEmail = document.querySelector<HTMLButtonElement>('#btnResendVerificationEmail');
  btnResendVerificationEmail?.addEventListener('click', () => {
    void resendVerificationEmailFromSettings();
  });

  const btnAddPasskey = document.querySelector<HTMLButtonElement>('#btnAddPasskey');
  btnAddPasskey?.addEventListener('click', () => {
    void handlePasskeyRegistration();
  });

  const btnAddPasskeyInline = document.querySelector<HTMLButtonElement>('#btnAddPasskeyInline');
  btnAddPasskeyInline?.addEventListener('click', () => {
    void handlePasskeyRegistration();
  });

  const btnLogout = document.querySelector<HTMLButtonElement>('#btnLogout');
  btnLogout?.addEventListener('click', () => {
    logoutUser();
  });

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
    if (Storage.check('Benutzer')) {
      void ensureEmailAnzeigeLoaded();
      void ensurePasskeyAnzeigeLoaded();
    }
  });

  if (Storage.check('Benutzer')) {
    void ensureEmailAnzeigeLoaded();
    void ensurePasskeyAnzeigeLoaded();
  }
});
