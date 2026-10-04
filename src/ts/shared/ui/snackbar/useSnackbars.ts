import { useSyncExternalStore } from 'react';

import { getSnackbarsSnapshot, subscribeSnackbars, type SnackbarEntry } from './snackbarStore';

/**
 * Aktive Snackbar-Eintraege, reaktiv aus dem `snackbarStore` gelesen.
 *
 * @returns Aktuell angezeigte Snackbar-Eintraege.
 */
export default function useSnackbars(): SnackbarEntry[] {
  return useSyncExternalStore(subscribeSnackbars, getSnackbarsSnapshot);
}
