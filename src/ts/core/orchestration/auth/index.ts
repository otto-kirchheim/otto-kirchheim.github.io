import { selectYear } from '@/features/Einstellungen/utils';
import { registerAppStartTask } from '@/core/bootstrap';
import type { IVorgabenU } from '@/types';
import { ACT_AS_STATUS_EVENT, updateActAsBanner } from '@/infrastructure/ui/actAsStatus';
import { getStoredMonatJahr } from '@/infrastructure/date/dateStorage';
import Storage from '@/infrastructure/storage/Storage';
import { default as updateTabVisibility } from '@/infrastructure/ui/updateTabVisibility';
import { getUserCookie, isAdmin } from '@/infrastructure/tokenManagement/decodeAccessToken';
import { initAutoSaveIndicator } from '@/infrastructure/autoSave/autoSaveIndicator';
import { initAutoSaveEventListener } from '@/infrastructure/autoSave/autoSave';
import { createModalLogin } from './components';
import { handleAuthUrlState } from './utils';
import { markStep } from '../initSequence';

let adminTabMounted = false;

async function ensureAdminTabMounted(): Promise<void> {
  if (adminTabMounted || !isAdmin()) return;
  const { mountAdminTab } = await import('@/features/Admin');
  const currentUserName = getUserCookie()?.userName ?? 'admin';
  mountAdminTab(currentUserName);
  adminTabMounted = true;
}

registerAppStartTask(() => {
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
    import('@/features/Admin/utils/actAs').then(({ loadOwnUserData }) => {
      void loadOwnUserData();
    });
  });
  window.addEventListener(ACT_AS_STATUS_EVENT, syncActAsNotice);
  window.addEventListener('storage', syncActAsNotice);
  syncActAsNotice();

  const hasRestorableSession = Storage.check('Benutzer') && getUserCookie();
  markStep('auth-gate', 'cookie:check');

  if (hasRestorableSession) {
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

    const { monat, jahr } = getStoredMonatJahr();

    if (jahrEl) jahrEl.value = jahr.toString();
    if (monatEl) monatEl.value = monat.toString();

    console.log('Benutzer gefunden');
    markStep('session-restore', 'sr:ui-welcome');

    updateTabVisibility(localVorgabenU?.Einstellungen?.aktivierteTabs);
    markStep('session-restore', 'sr:tab-visibility');

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
    markStep('session-restore', 'sr:admin-toggle');

    monatEl?.classList.remove('d-none');
    navmenuEl?.classList.remove('d-none');
    btnNavmenuEl?.classList.remove('d-none');
    markStep('session-restore', 'sr:nav-visible');

    initAutoSaveEventListener();
    markStep('session-restore', 'sr:autosave-listener');

    initAutoSaveIndicator();
    markStep('session-restore', 'sr:autosave-indicator');

    if (navigator.onLine) selectYear(monat, jahr);
    markStep('session-restore', 'sr:select-year');
  } else {
    adminEl?.classList.add('d-none');
    adminTabPaneEl?.classList.add('d-none');
    updateActAsBanner();
  }
  markStep('boot', 'boot:auth');
});
