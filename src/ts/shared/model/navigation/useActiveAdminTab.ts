import { useSyncExternalStore } from 'react';
import { getAktivenAdminTab, subscribeAktivenAdminTab } from './activeAdminTabStore';

/**
 * Aktiver Tab der Admin-Unternavigation, reaktiv. Siehe `activeAdminTabStore.ts`.
 *
 * @returns Id des aktiven Admin-Panes; `null` vor dem ersten Wechsel.
 */
export default function useActiveAdminTab(): string | null {
  return useSyncExternalStore(subscribeAktivenAdminTab, getAktivenAdminTab);
}
