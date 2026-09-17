import { useSyncExternalStore } from 'react';

import { getAutoSaveSnapshot, subscribeAutoSaveStatus, type AutoSaveSnapshot } from './autoSaveStatusStore';
import type { TResourceKey } from '@/types';

/** AutoSave-Status (Worst-Case über `resources`), reaktiv aus dem `autoSaveStatusStore` gelesen. */
export default function useAutoSaveStatus(resources: readonly TResourceKey[]): AutoSaveSnapshot {
  return useSyncExternalStore(subscribeAutoSaveStatus, () => getAutoSaveSnapshot(resources));
}
