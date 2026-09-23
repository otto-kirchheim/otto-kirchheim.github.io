import dayjs from '@/shared/lib/date/configDayjs';
import { registerAppStartTask } from '@/shared/lib/lifecycle/bootstrap';
import { openHelpModal } from '@/widgets/help-modal/openHelpModal';
import { markStep } from '@/shared/lib/lifecycle/initSequence';
import Storage from '@/shared/lib/storage/Storage';
import { default as saveDaten } from '@/shared/lib/ressource/saveDaten';
import { applyAutoSaveSettings } from '@/shared/lib/autosave/autoSave';
import { authApi } from '@/shared/api/apiService';
import { confirmDialog } from '@/shared/ui/dialog/confirmDialog';
import { createSnackBar } from '@/shared/ui/snackbar/CustomSnackbar';
import { ladeEinstellungenTeile } from '@/shared/model/einstellungen/einstellungenTeile';
import { createModalChangePassword, createModalPasskeySetPassword } from './ui';
import { setEmailStatus } from './model/emailStatusStore';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { generateEingabeMaskeEinstellungen, registerPasskey } from './model';
import selectYear from '@/pages/einstellungen/model/selectYear';
import changeMonatJahr from '@/shared/model/period/changeMonatJahr';
import logoutUser from '@/features/auth/model/logoutUser';

type PasskeyListItem = Awaited<ReturnType<typeof authApi.getPasskeys>>[number];

/**
 * Beschreibt die Geräteart eines Passkeys für die Anzeige (mehrgerätefähig, ob synchronisiert, oder gerätegebunden).
 *
 * @param passkey - Passkey-Eintrag der API.
 * @returns Anzeigetext ("Synchronisierte", "Mehrgeräte-", "Gerätegebundene" oder allgemeine Biometrie).
 */
function getPasskeyDeviceLabel(passkey: PasskeyListItem): string {
  if (passkey.deviceType === 'multiDevice') {
    return passkey.backedUp ? 'Synchronisierte Biometrie' : 'Mehrgeräte-Biometrie';
  }

  if (passkey.deviceType === 'singleDevice') {
    return 'Gerätegebundene Biometrie';
  }

  return 'Biometrie';
}

/**
 * Formatiert einen Passkey-Zeitstempel für die Anzeige.
 *
 * @param value - ISO-Zeitstempel oder `undefined`.
 * @returns Text im Format `DD.MM.YYYY HH:mm`, bei fehlendem Wert "noch nie".
 */
function formatPasskeyTimestamp(value?: string): string {
  if (!value) return 'noch nie';
  return dayjs(value).format('DD.MM.YYYY HH:mm');
}

/**
 * Zeichnet die Passkey-Liste (`#PasskeyList`) samt Zähler-Badge neu, zuletzt genutzte zuerst. Jeder Eintrag hat einen "Entfernen"-Knopf.
 *
 * @param passkeys - Passkeys des Benutzers.
 */
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
      'trennliste-eintrag d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3';

    const info = document.createElement('div');
    info.className = 'text-start';

    const title = document.createElement('div');
    title.className = 'fw-semibold';
    title.textContent = passkey.name;

    const badgeRow = document.createElement('div');
    badgeRow.className = 'd-flex flex-wrap gap-2 mt-2';

    const deviceBadge = document.createElement('span');
    deviceBadge.className = 'db-tag';
    deviceBadge.dataset['semantic'] = 'neutral';
    deviceBadge.dataset['emphasis'] = 'strong';
    deviceBadge.textContent = getPasskeyDeviceLabel(passkey);
    badgeRow.appendChild(deviceBadge);

    const backupBadge = document.createElement('span');
    backupBadge.className = 'db-tag';
    backupBadge.dataset['semantic'] = passkey.backedUp ? 'successful' : 'warning';
    backupBadge.dataset['emphasis'] = 'strong';
    backupBadge.textContent = passkey.backedUp ? 'Synchronisiert' : 'Nur lokal';
    badgeRow.appendChild(backupBadge);

    const meta = document.createElement('div');
    meta.className = 'small text-body-secondary mt-2';
    meta.textContent = `Zuletzt genutzt: ${formatPasskeyTimestamp(passkey.lastUsedAt)} · Hinzugefügt: ${formatPasskeyTimestamp(passkey.createdAt)}`;

    info.append(title, badgeRow, meta);

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'db-button';
    removeButton.dataset['variant'] = 'outlined';
    removeButton.dataset['color'] = 'critical';
    removeButton.dataset['size'] = 'small';
    removeButton.textContent = 'Entfernen';
    removeButton.addEventListener('click', () => {
      void removePasskeyFromSettings(passkey);
    });

    item.append(info, removeButton);
    passkeyList.appendChild(item);
  });
}

/**
 * Befüllt das E-Mail-Feld und den Verifizierungsstatus: zuerst aus dem Storage, dann mit der Antwort von `authApi.me()`. Der Knopf zum erneuten Senden erscheint nur bei nicht verifizierter Adresse.
 */
async function ensureEmailAnzeigeLoaded(): Promise<void> {
  const emailInput = document.querySelector<HTMLInputElement>('#EmailAnzeige');
  const resendButton = document.querySelector<HTMLButtonElement>('#btnResendVerificationEmail');

  if (!emailInput) return;

  const storedEmail = Storage.get<string>('BenutzerEmail', { default: '' });
  if (storedEmail) {
    emailInput.value = storedEmail;
    if (resendButton) resendButton.disabled = true;
    setEmailStatus({ text: 'Verifizierungsstatus wird geladen...', icon: 'clock' });
  }

  const me = await authApi.me().catch(() => null);

  if (me?.email) {
    Storage.set('BenutzerEmail', me.email);
    emailInput.value = me.email;
  }

  if (!resendButton) return;

  if (!me?.email) {
    resendButton.hidden = true;
    setEmailStatus({ text: 'E-Mail aktuell nicht verfügbar.', icon: 'exclamation_mark_circle' });
    return;
  }

  if (me.emailVerified === false) {
    resendButton.hidden = false;
    resendButton.disabled = false;
    setEmailStatus({ text: 'E-Mail ist noch nicht verifiziert.', icon: 'exclamation_mark_circle' });
    return;
  }

  resendButton.hidden = true;
  setEmailStatus({ text: 'E-Mail ist verifiziert.', icon: 'check' });
}

/**
 * Entfernt einen Passkey nach Rückfrage, meldet das Ergebnis per Snackbar und lädt die Anzeige neu.
 *
 * @param passkey - Zu entfernender Passkey.
 */
async function removePasskeyFromSettings(passkey: PasskeyListItem): Promise<void> {
  const confirmed = await confirmDialog(`Biometrie-Anmeldung „${passkey.name}“ wirklich entfernen?`);
  if (!confirmed) return;

  try {
    await authApi.deletePasskey(passkey.credentialId);
    createSnackBar({
      message: `Biometrie-Anmeldung „${passkey.name}“ wurde entfernt.`,
      status: 'success',
      timeout: 4000,
      fixed: true,
    });
    await ensurePasskeyAnzeigeLoaded();
  } catch (error) {
    createSnackBar({
      message: error instanceof Error ? error.message : 'Biometrie-Anmeldung konnte nicht entfernt werden.',
      status: 'danger',
      timeout: 5000,
      fixed: true,
    });
  }
}

/**
 * Lädt die Passkeys und setzt Liste, Statushinweis sowie Beschriftung und Verfügbarkeit des Einrichten-Knopfs. "Passwort per Passkey" erscheint nur, wenn WebAuthn unterstützt wird und mindestens ein Passkey existiert.
 */
async function ensurePasskeyAnzeigeLoaded(): Promise<void> {
  const inlinePasskeyButton = document.querySelector<HTMLButtonElement>('#btnAddPasskeyInline');
  const passkeySetPasswordButton = document.querySelector<HTMLButtonElement>('#btnPasswortPerPasskey');
  const passkeyHint = document.querySelector<HTMLElement>('#PasskeyStatus');

  if (!inlinePasskeyButton || !passkeyHint) return;

  const webAuthnSupported = browserSupportsWebAuthn();
  inlinePasskeyButton.disabled = !webAuthnSupported;

  const passkeys = await authApi.getPasskeys().catch(() => null);

  // Passwort-Neusetzen per Passkey nur anbieten, wenn mindestens ein Passkey nutzbar ist
  if (passkeySetPasswordButton) {
    passkeySetPasswordButton.hidden = !webAuthnSupported || !passkeys || passkeys.length === 0;
  }

  if (passkeys === null) {
    renderPasskeyList([]);
    passkeyHint.hidden = false;
    passkeyHint.textContent = 'Biometrie-Status konnte nicht geladen werden.';
    inlinePasskeyButton.textContent = 'Biometrie einrichten';
    return;
  }

  renderPasskeyList(passkeys);
  passkeyHint.hidden = false;

  if (!webAuthnSupported) {
    passkeyHint.textContent =
      passkeys.length > 0
        ? `${passkeys.length === 1 ? '1 Biometrie-Anmeldung' : `${passkeys.length} Biometrie-Anmeldungen`} auf anderen Geräten vorhanden. Einrichtung auf diesem Gerät nicht möglich.`
        : 'Biometrie-Anmeldung wird von diesem Browser nicht unterstützt.';
    inlinePasskeyButton.textContent = 'Biometrie einrichten';
    return;
  }

  if (passkeys.length === 0) {
    inlinePasskeyButton.textContent = 'Biometrie einrichten';
    passkeyHint.textContent = 'Noch keine Biometrie eingerichtet.';
    return;
  }

  inlinePasskeyButton.textContent = 'Weitere Biometrie einrichten';
  passkeyHint.textContent =
    passkeys.length === 1
      ? '1 Biometrie-Anmeldung eingerichtet.'
      : `${passkeys.length} Biometrie-Anmeldungen eingerichtet.`;
}

/**
 * Richtet einen neuen Passkey ein und aktualisiert bei Erfolg die Anzeige.
 */
async function handlePasskeyRegistration(): Promise<void> {
  const success = await registerPasskey();
  if (success) await ensurePasskeyAnzeigeLoaded();
}

/**
 * Sendet die Verifizierungs-E-Mail erneut und zeigt das Ergebnis per Snackbar. Der Knopf ist währenddessen deaktiviert; danach wird der Status neu geladen.
 */
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

/**
 * Wendet die gespeicherten Einstellungen zur Laufzeit an.
 * Derzeit nur AutoSave; das Theme liest `useColorMode` selbst aus dem Storage.
 */
function applyEinstellungenToRuntime(): void {
  const VorgabenU = Storage.get<{
    Einstellungen?: { autoSaveEnabled?: boolean; autoSaveDelayMs?: number };
  }>('VorgabenU', { default: {} });

  applyAutoSaveSettings(VorgabenU?.Einstellungen);
}

registerAppStartTask(async () => {
  // `#Monat` existiert zweimal (Desktop- und Mobile-Kopie im `AppHeader`) -- `querySelectorAll`,
  // sonst reagiert nur die zuerst gefundene Kopie auf Änderungen.
  document.querySelectorAll<HTMLInputElement>('#Monat').forEach(el => el.addEventListener('change', changeMonatJahr));

  const Jahr = document.querySelector<HTMLInputElement>('#Jahr');
  Jahr?.addEventListener('change', changeMonatJahr);

  const formSelectMonatJahr = document.querySelector<HTMLFormElement>('#formSelectMonatJahr');
  formSelectMonatJahr?.addEventListener('submit', e => {
    e.preventDefault();
    selectYear();
  });

  const btnPasswortAEndern = document.querySelector<HTMLButtonElement>('#btnPasswortAEndern');
  btnPasswortAEndern?.addEventListener('click', createModalChangePassword);

  const btnPasswortPerPasskey = document.querySelector<HTMLButtonElement>('#btnPasswortPerPasskey');
  btnPasswortPerPasskey?.addEventListener('click', createModalPasskeySetPassword);

  const btnResendVerificationEmail = document.querySelector<HTMLButtonElement>('#btnResendVerificationEmail');
  btnResendVerificationEmail?.addEventListener('click', () => {
    void resendVerificationEmailFromSettings();
  });

  const btnAddPasskeyInline = document.querySelector<HTMLButtonElement>('#btnAddPasskeyInline');
  btnAddPasskeyInline?.addEventListener('click', () => {
    void handlePasskeyRegistration();
  });

  // `querySelectorAll`, nicht `querySelector`: `#btnLogout` existiert zweimal (Desktop-Kopfzeile und Mobil-Schublade im
  // `AppHeader`); mit `querySelector` bliebe die Mobil-Kopie ohne Handler.
  document.querySelectorAll<HTMLButtonElement>('#btnLogout').forEach(btnLogout => {
    btnLogout.addEventListener('click', () => {
      logoutUser({ reason: 'manual' });
    });
  });

  const form = document.querySelector<HTMLFormElement>('#formEinstellungen');
  const saveButton = document.querySelector<HTMLButtonElement>('#btnSaveEinstellungen');

  if (form && saveButton)
    form.addEventListener('submit', event => {
      event.stopPropagation();
      event.preventDefault();
      saveDaten(saveButton);
    });

  // Die Einstellungen-Slots der Features laden (rendert deren Abschnitte); mit gespeicherten Vorgaben gleich befuellen.
  if (Storage.check('VorgabenU')) {
    await generateEingabeMaskeEinstellungen();
    applyEinstellungenToRuntime();
  } else await ladeEinstellungenTeile();

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

  document
    .querySelector<HTMLButtonElement>('#btnHelpEinstellungen')
    ?.addEventListener('click', () => openHelpModal('tab.einstellungen'));

  markStep('boot', 'boot:einstellungen');
});
