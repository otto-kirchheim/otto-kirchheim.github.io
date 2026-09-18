/*!
 * CustomSnackbar
 *
 * Copyright 2022-2026 Jan Otto
 */
import './CustomSnackbar.css';
import { addSnackbar } from './snackbarStore';
import type { SnackBarOptions } from './snackbarStore';

export type { SnackBarOptions, SnackBarAction, Tstatus, Tposition, Ticon } from './snackbarStore';

/**
 * Zeigt eine Snackbar an. Bleibt die einzige oeffentliche Funktion dieses Moduls -- die
 * Implementierung ist seit dem React-Umbau `snackbarStore.ts`/`SnackbarHost.tsx`/
 * `SnackbarItem.tsx` (Store + einmal in `App.tsx` gemounteter Host statt
 * `document.createElement`), Signatur/Rueckgabe-Vertrag (`.Close()` funktioniert auch spaeter
 * aufgerufen, siehe `setOffline.ts`/`FetchRetry.ts`) bleibt fuer alle Aufrufstellen unveraendert.
 */
export function createSnackBar(userOptions: SnackBarOptions): { Close: () => void } {
  return addSnackbar(userOptions);
}
