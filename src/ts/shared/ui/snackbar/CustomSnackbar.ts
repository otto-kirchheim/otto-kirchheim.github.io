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
 * Zeigt eine Snackbar an. Einzige oeffentliche Funktion dieses Moduls: der Zustand liegt in
 * `snackbarStore.ts`, gerendert wird er von `SnackbarHost.tsx`/`SnackbarItem.tsx` (einmal in
 * `App.tsx` gemountet).
 *
 * @param userOptions - Meldung und Darstellung (Status, Position, Timeout, Aktionen ...).
 * @returns Handle, dessen `Close()` die Meldung schliesst, auch bei spaeterem Aufruf
 *   (siehe `setOffline.ts`, `FetchRetry.ts`).
 */
export function createSnackBar(userOptions: SnackBarOptions): { Close: () => void } {
  return addSnackbar(userOptions);
}
