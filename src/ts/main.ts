import { pwaInfo } from 'virtual:pwa-info';
import { registerSW } from 'virtual:pwa-register';

import { logoutUser, changeMonatJahr, saveEinstellungen } from './features/Einstellungen/utils';
import { createSnackBar } from './class/CustomSnackbar';
import { default as Storage } from './infrastructure/storage/Storage';
import { default as compareVersion } from './infrastructure/validation/compareVersion';
import { default as initializeColorModeToggler } from './infrastructure/ui/BSColorToggler';
import { default as setOffline } from './infrastructure/ui/setOffline';
import { default as storageAvailable } from './infrastructure/storage/storageAvailable';
import dayjs from './infrastructure/date/configDayjs';
import { aktualisiereBerechnung } from './features/Berechnung';
import { registerHook, featureLifecycleRegistry } from './core/hooks';
import type { FeatureContext } from './core/hooks';

registerHook('auth:failure', logoutUser);
registerHook('network:reconnect', changeMonatJahr);
registerHook('post-save', aktualisiereBerechnung);
registerHook('pre-save:settings', saveEinstellungen);

featureLifecycleRegistry.registerFeature({
  name: 'Admin',
  async register(ctx: FeatureContext): Promise<void> {
    if (ctx.isAdmin) {
      document.querySelector<HTMLDivElement>('#admin')?.classList.remove('d-none');
      document.querySelector<HTMLDivElement>('#Admin')?.classList.remove('d-none');
      const { mountAdminTab } = await import('./features/Admin');
      mountAdminTab(ctx.userName);
    }
  },
  async unregister(): Promise<void> {
    const { unmountAdminTab } = await import('./features/Admin');
    unmountAdminTab();
  },
});

const intervalMS = 60 * 60 * 1000;

registerSW({
  onRegisteredSW(swUrl, r) {
    if (r)
      setInterval(async () => {
        if (!(!r.installing && navigator)) return;

        if ('connection' in navigator && !navigator.onLine) return;

        const resp = await fetch(swUrl, {
          cache: 'no-store',
          headers: {
            cache: 'no-store',
            'cache-control': 'no-cache',
          },
        });

        if (resp?.status === 200) await r.update();
      }, intervalMS);
  },
});
console.log(pwaInfo);

import Collapse from 'bootstrap/js/dist/collapse';
import Dropdown from 'bootstrap/js/dist/dropdown';
import Offcanvas from 'bootstrap/js/dist/offcanvas';
import Popover from 'bootstrap/js/dist/popover';
import Tab from 'bootstrap/js/dist/tab';
import { initializeAppBootstrap, registerAppStartTask } from './core';

console.log('Version:', import.meta.env.APP_VERSION);

registerAppStartTask(() => {
  setImpressumAndCopyright();

  Array.from(document.querySelectorAll('.dropdown-toggle')).forEach(dropdownToggleEl => new Dropdown(dropdownToggleEl));
  Array.from(document.querySelectorAll('.offcanvas')).forEach(offcanvasEl => new Offcanvas(offcanvasEl));
  Array.from(document.querySelectorAll('.collapse')).forEach(collapseEl => new Collapse(collapseEl, { toggle: false }));
  Array.from(document.querySelectorAll('[data-bs-toggle="popover"]')).forEach(
    popoverTriggerEl => new Popover(popoverTriggerEl),
  );

  if (Storage.size() > 3) {
    const currentVersion: string = import.meta.env.APP_VERSION;
    const clientVersion: string = Storage.get('Version', { check: true, default: '0.0.0' });
    if (compareVersion(clientVersion, currentVersion) < 0) {
      const benutzer = Storage.get<string>('Benutzer', { check: true, default: '' });
      sessionStorage.clear();
      logoutUser({ serverLogout: false });
      createSnackBar({
        message: `Hallo ${benutzer},<br/>die App hat ein Update erhalten.<br/>Bitte melde dich neu an, um<br/>die neuen Funktionen zu nutzen.`,
        timeout: 10000,
        fixed: true,
      });
    } else if (clientVersion !== currentVersion) Storage.set('Version', currentVersion);
  }
  if (!storageAvailable('localStorage')) {
    createSnackBar({
      message: 'Bitte Cookies zulassen!',
      dismissible: true,
      status: 'error',
      timeout: false,
      position: 'tc',
      fixed: false,
    });
  }
  initializeColorModeToggler();

  if (!navigator.onLine) setOffline();
  else window.addEventListener('offline', setOffline);

  if (Storage.check('Benutzer')) {
    const hash: string = document.location.hash;

    if (hash.length === 0) return;
    const selector: string = `${hash.toLowerCase()}-tab`;
    const tabElement = document.querySelector<HTMLButtonElement>(selector);

    if (!(tabElement instanceof HTMLButtonElement)) return;
    Tab.getOrCreateInstance(tabElement).show();
    window.scrollTo(0, 1);
  }

  function setImpressumAndCopyright() {
    const copyrightElement = document.querySelector<HTMLSpanElement>('#copyrightText');
    if (copyrightElement) {
      const startYearRaw = copyrightElement.dataset.startYear;
      const startYear = Number.parseInt(startYearRaw ?? '2021', 10);
      const currentYear = dayjs().year();
      const yearLabel =
        Number.isFinite(startYear) && startYear < currentYear ? `${startYear}-${currentYear}` : `${currentYear}`;
      copyrightElement.textContent = `© ${yearLabel} Jan Otto | v${import.meta.env.APP_VERSION}`;
    }

    const telefonElement = document.querySelector<HTMLSpanElement>('#impressumTelefon');
    const mailElement = document.querySelector<HTMLAnchorElement>('#impressumMail');
    if (telefonElement) {
      const country = ['+', '4', '9', '(', '0', ')'];
      const number = ['1', '7', '0', '-', '6', '7', '0', '8', '6', '9', '2'];
      telefonElement.textContent = `${country.join('')}${number.join('')}`;
    }
    if (mailElement) {
      const local = ['j', 'a', 'n', 'o', 't', 't', 'o', '1', '9', '8', '9'].join('');
      const domain = ['g', 'm', 'a', 'i', 'l', '.', 'c', 'o', 'm'].join('');
      const mail = `${local}@${domain}`;
      mailElement.textContent = mail;
      mailElement.href = `mailto:${mail}`;
    }
  }

  // Direkt nach DOMContentLoaded (defer) und auch im load-Event aufrufen
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setImpressumAndCopyright);
  } else {
    setImpressumAndCopyright();
  }
});

import './features/Berechnung';
import './features/Bereitschaft';
import './features/EWT';
import './features/Einstellungen';
import './core/orchestration/auth';
import './features/Neben';

initializeAppBootstrap();

import '../scss/styles.scss';
