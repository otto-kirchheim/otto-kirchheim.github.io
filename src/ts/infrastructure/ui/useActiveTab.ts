import { useSyncExternalStore } from 'react';
import { getAktivenTab, subscribeAktivenTab } from './activeTabStore';

/** Aktiver Tab der Hauptnavigation, reaktiv (Phase K6). Siehe `activeTabStore.ts`. */
export default function useActiveTab(): string | null {
  return useSyncExternalStore(subscribeAktivenTab, getAktivenTab);
}
