import { default as Storage } from '@/infrastructure/storage/Storage';
import { zeigeTab } from '@/infrastructure/ui/tabController';
import { setNavigationSichtbar } from '@/infrastructure/ui/navigationVisibleStore';
import { abortController } from '@/infrastructure/api/abortController';
import { cancelAllPending } from '@/infrastructure/autoSave/autoSave';
import { default as clearLoading } from '@/infrastructure/ui/clearLoading';
import { hideAllFeatureTabs } from '@/infrastructure/ui/updateTabVisibility';
import { updateActAsBanner } from '@/infrastructure/ui/actAsStatus';
import { resetAutoSaveStatusStore } from '@/infrastructure/autoSave/autoSaveStatusStore';
import { authApi } from '@/infrastructure/api/apiService';
import { featureLifecycleRegistry } from '@/core/hooks';
import { resetFeatureTabSync } from '@/core/orchestration/syncFeatureTabs';
import { publishEvent } from '@/core/events/appEvents';

type LogoutReason = 'manual' | 'token-expired' | 'version-mismatch';

/**
 * Schaltet eine CSS-Klasse an allen Treffern des Selektors. `querySelectorAll`, weil Elemente wie `#admin` in der Desktop- und Mobile-Kopie des `AppHeader` doppelt vorkommen.
 *
 * @param selector - CSS-Selektor der Elemente.
 * @param addClass - `true` setzt die Klasse, `false` entfernt sie.
 * @param className - Zu schaltende Klasse.
 */
function toggleClassForElement(selector: string, addClass: boolean = true, className: string = 'd-none'): void {
  document.querySelectorAll<HTMLElement>(selector).forEach(element => element.classList.toggle(className, addClass));
}

/**
 * Meldet den Benutzer ab: bricht offene Requests und AutoSaves ab, baut die Feature-Tabs ab, leert den Storage und setzt die Oberfläche auf den Startzustand zurück.
 *
 * @param options - `serverLogout`: Server-Logout auslösen (Standard `true`, nur mit vorhandenem Access-Token); `reason`: Grund des Logouts, wird im Event `user:logout` mitgegeben (Standard "manual").
 */
export default function logoutUser({
  serverLogout = true,
  reason = 'manual',
}: {
  serverLogout?: boolean;
  reason?: LogoutReason;
} = {}): void {
  cancelAllPending();
  resetAutoSaveStatusStore();
  abortController.reset('Logout');

  // Server-seitigen Logout nur dann auslösen, wenn der Logout bewusst vom User kommt
  // und überhaupt noch ein Access-Token vorhanden ist.
  if (serverLogout && Storage.check('AccessToken')) {
    authApi.logout().catch(() => {});
  }

  void featureLifecycleRegistry.teardownAll();
  resetFeatureTabSync();

  publishEvent('user:logout', { reason });

  Storage.clear();
  updateActAsBanner();

  if (zeigeTab('start')) window.scrollTo(0, 1);

  setNavigationSichtbar(false);
  for (const selector of ['#admin', '#MonatFeld', '#startSchnellzugriff']) toggleClassForElement(selector);
  hideAllFeatureTabs();

  clearLoading('btnLogin', false);
  toggleClassForElement('#btnLogin', false);

  const willkommen = document.querySelector<HTMLHeadingElement>('#Willkommen');
  if (willkommen) willkommen.innerHTML = 'Willkommen';
}
