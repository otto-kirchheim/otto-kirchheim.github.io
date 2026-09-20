import { useSyncExternalStore } from 'react';
import { getAktivenTab, subscribeAktivenTab } from './activeTabStore';

/**
 * Aktiver Tab der Hauptnavigation, reaktiv. Siehe `activeTabStore.ts`.
 *
 * @returns Id des aktiven Panes; `null` vor dem ersten Wechsel (Start-Pane).
 */
export default function useActiveTab(): string | null {
  return useSyncExternalStore(subscribeAktivenTab, getAktivenTab);
}
