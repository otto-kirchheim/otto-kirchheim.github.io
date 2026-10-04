import { DBDialog, DBDrawer } from '@db-ux/react-core-components';
import { useContext, useEffect, useRef, type CSSProperties, type FC, type ReactNode } from 'react';

import { DialogKontext, useVollbild } from '@/shared/ui/modal/DialogKontext';
import type { TMyModal } from '@/types';

/**
 * Huelle aller Dialoge mit `header`-/`footer`-Slot: auf dem Handy ein `DBDrawer` im Vollbild, ab `sm` ein zentrierter
 * `DBDialog` (Wahl beim Oeffnen, siehe `DialogKontext`). `onClose` kommt aus dem Kontext (`oeffneDialog` in `showModal.tsx`), so
 * raeumt jedes Schliessen -- Escape, Hintergrund, Schliessen-Knopf, `data-dialog-dismiss` -- den Dialog ab.
 *
 * Props: `onClose` (selbst gemountete Dialoge), `size` (`TMyModal.size`: `lg` = `large` (48rem), `xl` = 64rem, sonst `medium` (32rem); nur `DBDialog`), `header`
 *   (`MyModalHeader`), `footer` (`MyDialogFooter`) und der Inhalt.
 */
const MyDialog: FC<{
  size?: TMyModal<unknown>['size'];
  header: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  /** Schliess-Funktion fuer selbst gemountete Dialoge; ohne Angabe die aus dem `DialogKontext`. */
  onClose?: () => void;
}> = ({ size, header, footer, children, onClose }) => {
  const kontext = useContext(DialogKontext);
  const vollbild = useVollbild();
  const schliessen = onClose ?? kontext?.schliessen;
  const containerSize = size ? 'large' : undefined;
  const dialogRef = useRef<HTMLDialogElement>(null);

  // `showModal()` fokussiert das erste bedienbare Element -- das ist im Kopf der Hilfe-/Schliessen-Knopf, dessen Tooltip dann
  // sofort offen steht. Der Fokus geht stattdessen an den Dialog selbst (Fokus-Falle und Escape bleiben).
  useEffect(() => {
    const dialog = dialogRef.current;
    const aktiv = document.activeElement;
    if (!dialog || !(aktiv instanceof HTMLElement) || !aktiv.closest('.db-dialog-header, .db-drawer-header')) return;
    dialog.tabIndex = -1;
    dialog.focus({ preventScroll: true });
  }, []);

  if (vollbild) {
    return (
      <DBDrawer
        ref={dialogRef}
        open
        direction="to-left"
        containerSize="full"
        showSpacing={false}
        onClose={schliessen}
        header={header}
        footer={footer}
      >
        {children}
      </DBDrawer>
    );
  }

  return (
    <DBDialog
      ref={dialogRef}
      open
      containerSize={containerSize}
      // `xl` (64rem) liegt zwischen `large` (48rem) und `full`.
      style={size === 'xl' ? ({ '--db-dialog-max-width': '64rem' } as CSSProperties) : undefined}
      onClose={schliessen}
      header={header}
      footer={footer}
    >
      {children}
    </DBDialog>
  );
};
export default MyDialog;
