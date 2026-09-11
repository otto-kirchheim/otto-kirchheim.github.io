import { useSyncExternalStore } from 'react';

import { isButtonLoading, subscribeButtonLoading } from './buttonLoadingStore';

/** Ladezustand eines Buttons, reaktiv aus dem `buttonLoadingStore` gelesen. */
export default function useButtonLoading(id: string): boolean {
  return useSyncExternalStore(
    listener => subscribeButtonLoading(id, listener),
    () => isButtonLoading(id),
  );
}
