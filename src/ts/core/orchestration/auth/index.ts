import { selectYear } from '@/features/Einstellungen/utils';
import { registerAppStartTask } from '@/core/bootstrap';
import { openHelpModal } from '@/core/help/openHelpModal';
import type { IVorgabenU } from '@/types';
import { ACT_AS_STATUS_EVENT, updateActAsBanner } from '@/infrastructure/ui/actAsStatus';
import { getStoredMonatJahr } from '@/infrastructure/date/dateStorage';
import Storage from '@/infrastructure/storage/Storage';
import { default as updateTabVisibility } from '@/infrastructure/ui/updateTabVisibility';
import { getUserCookie, isAdmin } from '@/infrastructure/tokenManagement/decodeAccessToken';
import { initAutoSaveIndicator } from '@/infrastructure/autoSave/autoSaveIndicator';
import { initAutoSaveEventListener } from '@/infrastructure/autoSave/autoSave';
import { setNavigationSichtbar } from '@/infrastructure/ui/navigationVisibleStore';
import { setzeHauptTabErlaubtPruefung } from '@/infrastructure/ui/tabController';
import { createModalLogin } from './components';
import { handleAuthUrlState } from './utils';
import { markStep } from '../initSequence';

// `tabController.ts` bleibt bewusst auth-agnostisch (siehe dortiger Kommentar) -- die eigentliche
// Login-Policy fuer Hauptgruppen-Tabs (nur `start` ohne Session) sitzt deshalb hier, nicht dort.
// Pruefung live bei jedem Aufruf (nicht einmalig `hasRestorableSession` zwischenspeichern):
// deckt Login/Logout waehrend der Laufzeit korrekt ab, ohne einen zweiten `hashchange`-Listener.
setzeHauptTabErlaubtPruefung(id => id === 'start' || (Storage.check('Benutzer') && Boolean(getUserCookie())));

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
    if (vorgabenU?.VorgabenB?.[0]?.endeB?.Nwoche === undefined) Storage.remove('VorgabenU');
  }

  // `querySelectorAll`, nicht `querySelector`: `#btnLogin`/`#Monat`/`#MonatFeld` existieren seit
  // dem Shell-Umbau zweimal (Desktop- + Mobile-Control-Panel rendern `actions1` beide) --
  // dasselbe Muster wie `#admin`/`#admin-tab` unten.
  const btnLoginElemente = document.querySelectorAll<HTMLButtonElement>('#btnLogin');
  btnLoginElemente.forEach(el => el.addEventListener('click', () => createModalLogin()));

  document
    .querySelector<HTMLButtonElement>('#btnHelpStart')
    ?.addEventListener('click', () => openHelpModal('tab.start'));

  document.querySelectorAll<HTMLButtonElement>('#startSchnellzugriff [data-jump-tab]').forEach(quickButton => {
    quickButton.addEventListener('click', () => {
      document.querySelector<HTMLButtonElement>(`#${quickButton.dataset.jumpTab}`)?.click();
    });
  });

  const willkommenEl = document.querySelector<HTMLHeadingElement>('#Willkommen');
  const jahrEl = document.querySelector<HTMLInputElement>('#Jahr');
  const monatElemente = document.querySelectorAll<HTMLSelectElement>('#Monat');
  const monatFeldElemente = document.querySelectorAll<HTMLDivElement>('#MonatFeld');
  const loginDisplayEl = document.querySelector<HTMLDivElement>('#loginDisplay');
  const actAsButtonEl = document.querySelector<HTMLButtonElement>('#actAsOwnDataButton');

  const syncActAsNotice = () => {
    const actAsState = updateActAsBanner();
    const storedUserName = Storage.get<string | null>('Benutzer', { default: null });
    if (!willkommenEl || !storedUserName) return;

    const localVorgabenU = Storage.get<IVorgabenU | null>('VorgabenU', { default: null });
    const displayName = actAsState.active ? storedUserName : localVorgabenU?.Pers?.Vorname || storedUserName;
    willkommenEl.innerHTML = `Hallo, ${displayName}.`;
  };

  // `#admin`/`#admin-tab` existieren seit Phase K5 zweimal (Desktop-Kopfzeile + Drawer-Kopie
  // von `DBHeader`) -- ueberall `querySelectorAll` statt `querySelector`.
  const adminElemente = document.querySelectorAll<HTMLDivElement>('#admin');
  const adminTabPaneEl = document.querySelector<HTMLDivElement>('#Admin');
  const adminTabButtonElemente = document.querySelectorAll<HTMLButtonElement>('#admin-tab');
  const brandStartTabEl = document.querySelector<HTMLButtonElement>('#brand-start-tab');

  for (const el of adminTabButtonElemente) {
    el.addEventListener('click', () => {
      void ensureAdminTabMounted();
    });
  }
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
      : localVorgabenU?.Pers?.Vorname || gespeicherterBenutzer;
    if (!benutzer) {
      Storage.remove('Benutzer');
      return;
    }

    btnLoginElemente.forEach(el => el.classList.add('d-none'));

    if (willkommenEl) willkommenEl.innerHTML = `Hallo, ${benutzer}.`;
    if (loginDisplayEl) loginDisplayEl.classList.add('d-none');

    const { monat, jahr } = getStoredMonatJahr();

    if (jahrEl) jahrEl.value = jahr.toString();
    monatElemente.forEach(el => (el.value = monat.toString()));

    console.log('Benutzer gefunden');
    markStep('session-restore', 'sr:ui-welcome');

    updateTabVisibility(localVorgabenU?.Einstellungen?.aktivierteTabs);
    markStep('session-restore', 'sr:tab-visibility');

    const userIsAdmin = isAdmin();
    adminElemente.forEach(el => el.classList.toggle('d-none', !userIsAdmin));
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

    monatFeldElemente.forEach(el => el.classList.remove('d-none'));
    setNavigationSichtbar(true);
    document.querySelector<HTMLDivElement>('#startSchnellzugriff')?.classList.remove('d-none');
    markStep('session-restore', 'sr:nav-visible');

    initAutoSaveEventListener();
    markStep('session-restore', 'sr:autosave-listener');

    initAutoSaveIndicator();
    markStep('session-restore', 'sr:autosave-indicator');

    if (navigator.onLine) selectYear(monat, jahr);
    markStep('session-restore', 'sr:select-year');
  } else {
    adminElemente.forEach(el => el.classList.add('d-none'));
    adminTabPaneEl?.classList.add('d-none');
    updateActAsBanner();
  }
  markStep('boot', 'boot:auth');
});
