import { createContext, useContext, useState } from 'react';

import { BREAKPOINTS } from '@/shared/ui/custom-table/breakpoints';

/**
 * Kontext des geoeffneten Dialogs (gesetzt in `oeffneDialog`, `showModal.tsx`): `schliessen` fuer `onClose` und `vollbild`
 * (Handy-Breite beim Oeffnen: `MyDialog`, `MyModalHeader` und `MyDialogFooter` nehmen dann `DBDrawer`-Bausteine im Vollbild statt
 * `DBDialog`). Die Wahl faellt einmal beim Oeffnen, ein Drehen des Geraets baut den Dialog nicht um.
 */
export type DialogKontextWert = { schliessen: () => void; vollbild: boolean };

export const DialogKontext = createContext<DialogKontextWert | null>(null);

/**
 * Ob gerade Handy-Breite herrscht (unter `sm`): dann oeffnen Dialoge als Vollbild-`DBDrawer`.
 *
 * @returns `true` unter `sm`; ohne `matchMedia` (Tests) `false`.
 */
export function istHandyBreite(): boolean {
  return window.matchMedia?.(`(max-width: ${BREAKPOINTS.sm - 0.05}px)`)?.matches ?? false;
}

/**
 * Vollbild-Entscheidung eines Dialogs: aus dem `DialogKontext` (`showModal`), sonst einmalig beim ersten Rendern gemessen
 * (Dialoge, die selbst gemountet werden, z. B. per `createPortal`).
 *
 * @returns `true`, wenn der Dialog als Vollbild-`DBDrawer` aufgebaut wird.
 */
export function useVollbild(): boolean {
  const kontext = useContext(DialogKontext);
  const [gemessen] = useState(istHandyBreite);
  return kontext ? kontext.vollbild : gemessen;
}
