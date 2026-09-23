import { selectYear } from '@/features/Einstellungen/utils';
import { registerAppStartTask } from '@/app/init/bootstrap';
import { openHelpModal } from '@/core/help/openHelpModal';
import type { IVorgabenU } from '@/types';
import { ACT_AS_STATUS_EVENT, updateActAsBanner } from '@/shared/model/session/actAsStatus';
import { getStoredMonatJahr } from '@/shared/lib/date/dateStorage';
import Storage from '@/shared/lib/storage/Storage';
import { default as updateTabVisibility } from '@/infrastructure/ui/updateTabVisibility';
import { getUserCookie, isAdmin } from '@/shared/api/token/decodeAccessToken';
import { initAutoSaveEventListener } from '@/shared/lib/autosave/autoSave';
import { setNavigationSichtbar } from '@/shared/model/navigation/navigationVisibleStore';
import { setzeHauptTabErlaubtPruefung } from '@/infrastructure/ui/tabController';
import { createModalLogin } from '@/features/auth/ui';
import { handleAuthUrlState } from '@/features/auth/model';
import { markStep } from '@/app/init/initSequence';

// `tabController.ts` bleibt bewusst auth-agnostisch (siehe dortiger Kommentar) -- die Login-Policy
// fuer Hauptgruppen-Tabs (ohne Session nur `start`) sitzt deshalb hier. Die Pruefung laeuft live
// bei jedem Aufruf, damit Login/Logout zur Laufzeit ohne zweiten `hashchange`-Listener greifen.
setzeHauptTabErlaubtPruefung(id => id === 'start' || (Storage.check('Benutzer') && Boolean(getUserCookie())));

let adminTabMounted = false;

/** Mountet den Admin-Tab einmalig per Lazy-Import, sofern der Benutzer Admin ist. */
async function ensureAdminTabMounted(): Promise<void> {
  if (adminTabMounted || !isAdmin()) return;
  const { mountAdminTab } = await import('@/features/Admin/mountAdminTab');
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

  // `querySelectorAll`, nicht `querySelector`: `#btnLogin`/`#Monat`/`#MonatFeld` existieren zweimal
  // (Desktop- und Mobile-Control-Panel in `AppHeader.tsx` rendern `actions1` beide) -- ebenso
  // `#admin`/`#admin-tab` unten.
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

  /** Aktualisiert Act-As-Banner und Begruessung (Vorname, im Act-As-Modus der Anmeldename). */
  const syncActAsNotice = () => {
    const actAsState = updateActAsBanner();
    const storedUserName = Storage.get<string | null>('Benutzer', { default: null });
    if (!willkommenEl || !storedUserName) return;

    const localVorgabenU = Storage.get<IVorgabenU | null>('VorgabenU', { default: null });
    const displayName = actAsState.active ? storedUserName : localVorgabenU?.Pers?.Vorname || storedUserName;
    willkommenEl.innerHTML = `Hallo, ${displayName}.`;
  };

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
