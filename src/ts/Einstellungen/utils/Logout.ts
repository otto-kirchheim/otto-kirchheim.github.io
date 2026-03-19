import Tab from 'bootstrap/js/dist/tab';
import { Storage, abortController, cancelAllPending, clearLoading, hideAllFeatureTabs } from '../../utilities';
import { destroyAutoSaveIndicator } from '../../utilities/autoSaveIndicator';
import { authApi } from '../../utilities/apiService';

function toggleClassForElement(selector: string, addClass: boolean = true, className: string = 'd-none'): void {
  const element = document.querySelector<HTMLElement>(selector);
  if (addClass) element?.classList.add(className);
  else element?.classList.remove(className);
}

export default function Logout(): void {
  cancelAllPending();
  destroyAutoSaveIndicator();
  abortController.reset('Logout');

  // Server-seitigen Logout auslösen (Cookies löschen)
  authApi.logout().catch(() => {});

  import('../../Admin').then(({ unmountAdminTab }) => unmountAdminTab());

  Storage.clear();

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
