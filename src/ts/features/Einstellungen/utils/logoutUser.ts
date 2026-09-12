import { default as Storage } from '@/infrastructure/storage/Storage';
import { zeigeTab } from '@/infrastructure/ui/tabController';
import { setNavigationSichtbar } from '@/infrastructure/ui/navigationVisibleStore';
import { abortController } from '@/infrastructure/api/abortController';
import { cancelAllPending } from '@/infrastructure/autoSave/autoSave';
import { default as clearLoading } from '@/infrastructure/ui/clearLoading';
import { hideAllFeatureTabs } from '@/infrastructure/ui/updateTabVisibility';
import { updateActAsBanner } from '@/infrastructure/ui/actAsStatus';
import { destroyAutoSaveIndicator } from '@/infrastructure/autoSave/autoSaveIndicator';
import { authApi } from '@/infrastructure/api/apiService';
import { featureLifecycleRegistry } from '@/core/hooks';
import { resetFeatureTabSync } from '@/core/orchestration/syncFeatureTabs';
import { publishEvent } from '@/core/events/appEvents';

type LogoutReason = 'manual' | 'token-expired' | 'version-mismatch';

// `querySelectorAll`, nicht `querySelector`: `#admin` existiert seit Phase K5 zweimal
// (Desktop-Kopfzeile + Drawer-Kopie von `DBHeader`).
function toggleClassForElement(selector: string, addClass: boolean = true, className: string = 'd-none'): void {
  document.querySelectorAll<HTMLElement>(selector).forEach(element => element.classList.toggle(className, addClass));
}

export default function logoutUser({
  serverLogout = true,
  reason = 'manual',
}: {
  serverLogout?: boolean;
  reason?: LogoutReason;
} = {}): void {
  cancelAllPending();
  destroyAutoSaveIndicator();
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
