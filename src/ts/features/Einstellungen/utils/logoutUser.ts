import Tab from 'bootstrap/js/dist/tab';
import {
  Storage,
  abortController,
  cancelAllPending,
  clearLoading,
  hideAllFeatureTabs,
  updateActAsBanner,
} from '../../../utilities';
import { destroyAutoSaveIndicator } from '../../../infrastructure/autoSave/autoSaveIndicator';
import { authApi } from '../../../infrastructure/api/apiService';

function toggleClassForElement(selector: string, addClass: boolean = true, className: string = 'd-none'): void {
  const element = document.querySelector<HTMLElement>(selector);
  if (addClass) element?.classList.add(className);
  else element?.classList.remove(className);
}

export default function logoutUser({ serverLogout = true }: { serverLogout?: boolean } = {}): void {
  cancelAllPending();
  destroyAutoSaveIndicator();
  abortController.reset('Logout');

  // Server-seitigen Logout nur dann auslösen, wenn der Logout bewusst vom User kommt
  // und überhaupt noch ein Access-Token vorhanden ist.
  if (serverLogout && Storage.check('AccessToken')) {
    authApi.logout().catch(() => {});
  }

  import('../../Admin').then(({ unmountAdminTab }) => unmountAdminTab());

  Storage.clear();
  updateActAsBanner();

  const sel = document.querySelector<HTMLButtonElement>(`#start-tab`);
  if (sel instanceof HTMLButtonElement) {
    Tab.getOrCreateInstance(sel).show();
    window.scrollTo(0, 1);
  }

  for (const selector of ['#navmenu', '#btn-navmenu', '#admin', '#Monat']) toggleClassForElement(selector);
  hideAllFeatureTabs();

  clearLoading('btnLogin', false);
  toggleClassForElement('#btnLogin', false);

  const willkommen = document.querySelector<HTMLHeadingElement>('#Willkommen');
  if (willkommen) willkommen.innerHTML = 'Willkommen';
}
