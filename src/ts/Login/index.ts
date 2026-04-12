import { selectYear } from '../Einstellungen/utils';
import type { IVorgabenU } from '../interfaces';
import { ACT_AS_STATUS_EVENT, Storage, updateActAsBanner, updateTabVisibility } from '../utilities';
import dayjs from '../utilities/configDayjs';
import { getUserCookie, isAdmin } from '../utilities/decodeAccessToken';
import { initAutoSaveIndicator } from '../utilities/autoSaveIndicator';
import { createModalLogin } from './components';
import { handleAuthUrlState } from './utils';

let adminTabMounted = false;

async function ensureAdminTabMounted(): Promise<void> {
  if (adminTabMounted || !isAdmin()) return;
  const { mountAdminTab } = await import('../Admin');
  const currentUserName = getUserCookie()?.userName ?? 'admin';
  mountAdminTab(currentUserName);
  adminTabMounted = true;
}

window.addEventListener('load', () => {
  handleAuthUrlState();

  if (Storage.check('VorgabenU')) {
    const vorgabenU = Storage.get<IVorgabenU>('VorgabenU', true);
    if (vorgabenU?.vorgabenB?.[0]?.endeB?.Nwoche === undefined) Storage.remove('VorgabenU');
  }

  const btnLogin = document.querySelector<HTMLButtonElement>('#btnLogin');
  btnLogin?.addEventListener('click', () => createModalLogin());

  const willkommenEl = document.querySelector<HTMLHeadingElement>('#Willkommen');
  const jahrEl = document.querySelector<HTMLInputElement>('#Jahr');
  const monatEl = document.querySelector<HTMLInputElement>('#Monat');
  const loginDisplayEl = document.querySelector<HTMLDivElement>('#loginDisplay');
  const actAsButtonEl = document.querySelector<HTMLButtonElement>('#actAsOwnDataButton');

  const syncActAsNotice = () => {
    const actAsState = updateActAsBanner();
    const storedUserName = Storage.get<string | null>('Benutzer', { default: null });
    if (!willkommenEl || !storedUserName) return;

    const localVorgabenU = Storage.get<IVorgabenU | null>('VorgabenU', { default: null });
    const displayName = actAsState.active ? storedUserName : localVorgabenU?.pers?.Vorname || storedUserName;
    willkommenEl.innerHTML = `Hallo, ${displayName}.`;
  };

  const adminEl = document.querySelector<HTMLDivElement>('#admin');
  const adminTabPaneEl = document.querySelector<HTMLDivElement>('#Admin');
  const adminTabButtonEl = document.querySelector<HTMLButtonElement>('#admin-tab');
  const brandStartTabEl = document.querySelector<HTMLButtonElement>('#brand-start-tab');
  const navmenuEl = document.querySelector<HTMLDivElement>('#navmenu');
  const btnNavmenuEl = document.querySelector<HTMLButtonElement>('#btn-navmenu');

  adminTabButtonEl?.addEventListener('click', () => {
    void ensureAdminTabMounted();
  });
  actAsButtonEl?.addEventListener('click', () => {
    import('../Admin/utils/actAs').then(({ loadOwnUserData }) => {
      void loadOwnUserData();
    });
  });
  window.addEventListener(ACT_AS_STATUS_EVENT, syncActAsNotice);
  window.addEventListener('storage', syncActAsNotice);
  syncActAsNotice();

  if (Storage.check('Benutzer') && getUserCookie()) {
    const localVorgabenU = Storage.get<IVorgabenU | null>('VorgabenU', { default: null });
    const gespeicherterBenutzer = Storage.get<string>('Benutzer', true);
    const actAsState = updateActAsBanner();
    const benutzer: string = actAsState.active
      ? gespeicherterBenutzer
      : localVorgabenU?.pers?.Vorname || gespeicherterBenutzer;
    if (!benutzer) {
      Storage.remove('Benutzer');
      return;
    }

    if (btnLogin) btnLogin.classList.add('d-none');

    if (willkommenEl) willkommenEl.innerHTML = `Hallo, ${benutzer}.`;
    if (loginDisplayEl) loginDisplayEl.classList.add('d-none');

    const jahr: number = Storage.get<number>('Jahr', { default: dayjs().year() });
    const monat: number = Storage.get<number>('Monat', { default: dayjs().month() + 1 });

    if (jahrEl) jahrEl.value = jahr.toString();
    if (monatEl) monatEl.value = monat.toString();

    console.log('Benutzer gefunden');

    updateTabVisibility(localVorgabenU?.Einstellungen?.aktivierteTabs);

    const userIsAdmin = isAdmin();
    adminEl?.classList.toggle('d-none', !userIsAdmin);
    adminTabPaneEl?.classList.toggle('d-none', !userIsAdmin);

    if (!userIsAdmin) {
      Storage.remove('actAsUserId');
      Storage.remove('actAsUserName');
      syncActAsNotice();
    }

    if (userIsAdmin) {
      void ensureAdminTabMounted();
    }

    if (!userIsAdmin && window.location.hash.toLowerCase() === '#admin') {
      brandStartTabEl?.click();
      window.location.hash = '#start';
    }

    monatEl?.classList.remove('d-none');
    navmenuEl?.classList.remove('d-none');
    btnNavmenuEl?.classList.remove('d-none');

    initAutoSaveIndicator();

    if (navigator.onLine) selectYear(monat, jahr);
  } else {
    adminEl?.classList.add('d-none');
    adminTabPaneEl?.classList.add('d-none');
    updateActAsBanner();
  }
});
