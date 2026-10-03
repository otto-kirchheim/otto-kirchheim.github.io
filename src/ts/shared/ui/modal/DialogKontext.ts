import { createContext } from 'react';

/**
 * Kontext des geoeffneten Dialogs (gesetzt in `oeffneDialog`, `showModal.tsx`): `schliessen` fuer `onClose` und `vollbild`
 * (Handy-Breite beim Oeffnen: `MyDialog`, `MyModalHeader` und `MyDialogFooter` nehmen dann `DBDrawer`-Bausteine im Vollbild statt `DBDialog`). Die Wahl faellt einmal beim Oeffnen, ein
 * Drehen des Geraets baut den Dialog nicht um.
 */
export type DialogKontextWert = { schliessen: () => void; vollbild: boolean };

export const DialogKontext = createContext<DialogKontextWert | null>(null);
