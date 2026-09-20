import { pwaInfo } from 'virtual:pwa-info';
import { registerSW } from 'virtual:pwa-register';

import { logoutUser, changeMonatJahr, saveEinstellungen } from '@/features/Einstellungen/utils';
import { createSnackBar, initPullToRefresh, setVersionOutdated } from '@/infrastructure/ui';
import { default as Storage } from '@/infrastructure/storage/Storage';
import { default as compareVersion } from '@/infrastructure/validation/compareVersion';
import { default as setOffline } from '@/infrastructure/ui/setOffline';
import { default as storageAvailable } from '@/infrastructure/storage/storageAvailable';
import { registerHook, featureLifecycleRegistry } from './core/hooks';
import type { FeatureContext } from './core/hooks';
import { validateAllSequences, markStep } from './core/orchestration/initSequence';

validateAllSequences();

registerHook('auth:failure', () => logoutUser({ reason: 'token-expired' }));
registerHook('network:reconnect', changeMonatJahr);
registerHook('pre-save:settings', saveEinstellungen);
registerHook('app:version-outdated', () => setVersionOutdated(updateSW));

featureLifecycleRegistry.registerFeature({
  name: 'Admin',
  /**
   * Zeigt den Admin-Bereich und mountet den Admin-Tab (lazy geladen), sofern der Benutzer Admin ist.
   *
   * @param ctx - Feature-Kontext mit `isAdmin` und `userName`.
   */
  async register(ctx: FeatureContext): Promise<void> {
    if (ctx.isAdmin) {
      // `#admin` existiert zweimal (Desktop-Kopfzeile + Drawer-Kopie von `DBHeader`) --
      // beide Vorkommen anfassen, nicht nur das erste.
      document.querySelectorAll<HTMLDivElement>('#admin').forEach(el => el.classList.remove('d-none'));
      document.querySelector<HTMLDivElement>('#Admin')?.classList.remove('d-none');
      const { mountAdminTab } = await import('@/features/Admin/mountAdminTab');
      mountAdminTab(ctx.userName);
    }
  },
  /** Unmountet den Admin-Tab (Modul lazy geladen). */
  async unregister(): Promise<void> {
    const { unmountAdminTab } = await import('@/features/Admin/mountAdminTab');
    unmountAdminTab();
  },
});

// Ein einmal registrierter Service Worker ueberlebt das Abschalten von `devOptions` --
// er liefert dann weiter alte Bundles aus, und Fehlerbilder ueberstehen Reload und
// Server-Neustart. Im Dev-Modus deshalb aktiv abmelden und die Caches leeren.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then(async registrierungen => {
    if (registrierungen.length === 0) return;
    await Promise.all(registrierungen.map(registrierung => registrierung.unregister()));
    if ('caches' in window) {
      const namen = await caches.keys();
      await Promise.all(namen.map(name => caches.delete(name)));
    }
    console.warn('Alter Service Worker abgemeldet und Caches geleert -- Seite wird neu geladen.');
    location.reload();
  });
}

const intervalMS = 60 * 60 * 1000;

const updateSW = registerSW({
  /**
   * Prueft stuendlich, ob der Service-Worker-Code auf dem Server erreichbar ist, und stoesst dann ein Update an.
   *
   * @param swUrl - URL des Service Workers.
   * @param r - Registrierung; ohne Registrierung wird kein Intervall gestartet.
   */
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
if (import.meta.env.DEV) console.log(pwaInfo ?? 'No PWA info available.');

import { initTabController, zeigeTabAusHash } from '@/infrastructure/ui/tabController';
import { createElement } from 'react';
import { mount } from '@/infrastructure/ui/reactRoot';
import App from './App';
import { initializeAppBootstrap, registerAppStartTask } from './core';

console.log('Version:', import.meta.env.APP_VERSION);

// Root-Render und `initTabController()` laufen bewusst synchron beim Modul-Import, nicht als
// `registerAppStartTask`-Eintrag: ES-Imports werten VOR dem Top-Level-Code aus, daher steht `auth/index.ts`s
// Start-Task (`import './core/orchestration/auth'` unten) trotz spaeterer Quelltextposition VOR einem hier
// registrierten in der Queue. Er greift ueber `selectYear` -> `setMonatJahr` auf `#Monat` zu, das erst
// `AppHeader`s Mount erzeugt. Gemountet wird ueber `mount()` (per `flushSync`), nicht ueber
// `createRoot().render()`: nur so laufen auch die `useEffect`-Hooks (z. B. Tabellen-Erzeugung in
// `EinstellungenTab`) synchron, bevor der erste Start-Task (spaetestens bei `window: 'load'`) ihre
// Elemente erwartet.
const appRoot = document.getElementById('app');
if (appRoot) mount(appRoot, createElement(App));

// Die mobile Navigations-Schublade bringt `DBHeader` (AppHeader.tsx) eingebaut mit.
initTabController();

// Muss nach dem Root-Mount stehen: `.db-shell-content` entsteht erst mit `App.tsx`s Baum.
initPullToRefresh();

registerAppStartTask(() => {
  if (Storage.size() > 3) {
    const currentVersion: string = import.meta.env.APP_VERSION;
    const clientVersion: string = Storage.get('Version', { check: true, default: '0.0.0' });
    if (compareVersion(clientVersion, currentVersion) < 0) {
      const benutzer = Storage.get<string>('Benutzer', { check: true, default: '' });
      sessionStorage.clear();
      logoutUser({ serverLogout: false, reason: 'version-mismatch' });
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
  if (!navigator.onLine) setOffline();
  else window.addEventListener('offline', setOffline);

  // `zeigeTabAusHash()` IMMER aufrufen (nicht nur wenn angemeldet): `tabController.ts`s Login-Gate
  // (`zeigeTab()`, geschuetzte Haupttabs -> `start`) korrigiert einen Deep-Link-/Alt-Hash (`#EWT` u.ae.)
  // sonst nicht -- die Adressleiste bliebe falsch, obwohl `start` angezeigt wird. `scrollTo(0, 1)`
  // (Mobile-Safari: Adressleiste einklappen) nur fuer den eingeloggten Fall.
  const hashGezeigt = zeigeTabAusHash();
  if (Storage.check('Benutzer') && hashGezeigt) window.scrollTo(0, 1);

  markStep('boot', 'boot:main-ui');
});

import '@/features/Berechnung';
import '@/features/Bereitschaft';
import '@/features/EWT';
import '@/features/Einstellungen';
import './core/orchestration/auth';
import '@/features/Neben';
import '@/features/EA';

initializeAppBootstrap();

// Reihenfolge ist bedeutsam: erst die Layer-Deklaration, dann DB UX, dann die App-Styles.
import '../scss/layers.scss';
import '../scss/db-ux.css';
import '../scss/utilities.scss';
import '../scss/styles.scss';
