import { DBDialogFooter, DBDrawerFooter } from '@db-ux/react-core-components';
import { useContext, type FC, type ReactNode } from 'react';

import { DialogKontext } from '@/shared/ui/modal/DialogKontext';

/**
 * Fusszeile eines Dialogs: `DBDrawerFooter` im Vollbild-Drawer (Handy), sonst `DBDialogFooter` (siehe `DialogKontext`). Die
 * Lint-Regel `sub-component-required-parent` erkennt den `footer`-Slot nur direkt am `DBDialog`/`DBDrawer`, deshalb benutzen
 * alle Aufrufstellen diesen Baustein.
 *
 * Props: `children` (Knoepfe) und optional `className`.
 */
const MyDialogFooter: FC<{ children?: ReactNode; className?: string }> = ({ children, className }) => {
  const kontext = useContext(DialogKontext);
  return kontext?.vollbild ? (
    <DBDrawerFooter className={className}>{children}</DBDrawerFooter>
  ) : (
    <DBDialogFooter className={className}>{children}</DBDialogFooter>
  );
};
export default MyDialogFooter;
