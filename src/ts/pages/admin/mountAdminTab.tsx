import { mount, unmount } from '@/infrastructure/ui';
import AdminTab from './index';

/**
 * Mountet den Admin-Bereich in `#admin-root`; ohne den Container passiert nichts.
 *
 * @param remountKey - React-`key` des Admin-Bereichs; ein anderer Wert erzwingt einen frischen Neuaufbau.
 */
export function mountAdminTab(remountKey = 'default'): void {
  const adminRoot = document.querySelector<HTMLDivElement>('#admin-root');
  if (!adminRoot) return;

  mount(adminRoot, <AdminTab key={remountKey} />);
}

/**
 * Entfernt den Admin-Bereich aus `#admin-root`; ohne den Container passiert nichts.
 */
export function unmountAdminTab(): void {
  const adminRoot = document.querySelector<HTMLDivElement>('#admin-root');
  if (!adminRoot) return;

  unmount(adminRoot);
}
