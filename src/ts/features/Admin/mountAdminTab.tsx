import { mount, unmount } from '@/infrastructure/ui';
import AdminTab from './index';

export function mountAdminTab(remountKey = 'default'): void {
  const adminRoot = document.querySelector<HTMLDivElement>('#admin-root');
  if (!adminRoot) return;

  mount(adminRoot, <AdminTab key={remountKey} />);
}

export function unmountAdminTab(): void {
  const adminRoot = document.querySelector<HTMLDivElement>('#admin-root');
  if (!adminRoot) return;

  unmount(adminRoot);
}
