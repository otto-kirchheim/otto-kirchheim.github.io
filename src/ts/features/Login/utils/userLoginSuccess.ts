import { selectYear } from '../../Einstellungen/utils';
import { createSnackBar } from '../../../class/CustomSnackbar';
import Storage from '../../../infrastructure/storage/Storage';
import { default as setLoading } from '../../../infrastructure/ui/setLoading';
import { updateActAsBanner } from '../../../infrastructure/ui/actAsStatus';
import { isAdmin } from '../../../infrastructure/tokenManagement/decodeAccessToken';
import { initAutoSaveIndicator } from '../../../infrastructure/autoSave/autoSaveIndicator';
import dayjs from '../../../infrastructure/date/configDayjs';
import requestVerificationMail from './requestVerificationMail';
import { featureLifecycleRegistry } from '../../../core/hooks';

function escapeHtml(unsafe: string): string {
  return unsafe.replace(/[&<"']/g, function (match) {
    const escape: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return escape[match];
  });
}

export default async function userLoginSuccess({
  username,
  role,
  email,
  emailVerified,
}: {
  username: string;
  role?: string;
  email?: string;
  emailVerified?: boolean;
}): Promise<void> {
  setLoading('btnLogin');

  Storage.set('Version', import.meta.env.APP_VERSION);

  username = `${username[0].toUpperCase()}${username.substring(1)}`;
  Storage.set('Benutzer', username);
  if (role) Storage.set('BenutzerRolle', role);
  if (email) Storage.set('BenutzerEmail', email);
  const willkommen = document.querySelector<HTMLHeadingElement>('#Willkommen');
  if (willkommen) willkommen.innerHTML = `Hallo, ${escapeHtml(username)}.`;

  document.querySelector<HTMLButtonElement>('#btnLogin')?.classList.add('d-none');

  const aktJahr = dayjs().year();
  const jahrInput = document.querySelector<HTMLInputElement>('#Jahr');
  if (jahrInput) jahrInput.value = aktJahr.toString();

  const monat = dayjs().month() + 1;
  const monatInput = document.querySelector<HTMLInputElement>('#Monat');
  if (monatInput) monatInput.value = monat.toString();

  const userIsAdmin = role ? role !== 'member' : isAdmin();
  if (!userIsAdmin) {
    Storage.remove('actAsUserId');
    Storage.remove('actAsUserName');
  }

  await featureLifecycleRegistry.initializeAll({ isAdmin: userIsAdmin, userName: username });

  const monatEl = document.querySelector<HTMLInputElement>('#Monat');
  monatEl?.classList.remove('d-none');

  console.log('Eingeloggt');

  if (emailVerified === false) {
    createSnackBar({
      message: 'Deine E-Mail ist noch nicht verifiziert. Passwort-Reset ist erst nach Verifizierung möglich.',
      status: 'warning',
      timeout: 10000,
      fixed: true,
      actions: [
        {
          text: 'Verifizierungs-Mail erneut senden',
          function: () => {
            void requestVerificationMail(email);
          },
          dismiss: true,
          class: ['text-primary'],
        },
      ],
    });
  }

  updateActAsBanner();
  initAutoSaveIndicator();
  selectYear(monat, aktJahr);
}
