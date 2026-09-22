import { useSyncExternalStore } from 'react';

import { isButtonLoading, subscribeButtonLoading } from './buttonLoadingStore';

/**
 * Ladezustand eines Buttons, reaktiv aus dem `buttonLoadingStore` gelesen.
 *
 * @param id - Button-Id, unter der der Ladezustand im Store liegt.
 * @returns `true`, solange der Button laedt.
 */
export default function useButtonLoading(id: string): boolean {
  return useSyncExternalStore(
    listener => subscribeButtonLoading(id, listener),
    () => isButtonLoading(id),
  );
}
