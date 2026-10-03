import { DBButton, DBDialogHeader, DBDrawerHeader, DBTooltip } from '@db-ux/react-core-components';
import { useContext, type FC } from 'react';

import type { HelpContextKey } from '@/shared/lib/help/helpContent';
import { invokeHook } from '@/shared/lib/feature';
import { DialogKontext } from '@/shared/ui/modal/DialogKontext';

/**
 * Kopfzeile der Dialoge (`DBDrawerHeader` im Vollbild-Drawer auf dem Handy, sonst `DBDialogHeader`; siehe `DialogKontext`):
 * Titel links, optional Hilfe-Knopf, Schliessen-Knopf rechts. Der Header verknuepft den `<dialog>` selbst per
 * `aria-labelledby` mit der Ueberschrift; sein Schliessen-Knopf loest `onClose` aus.
 *
 * Props: `title` (Dialogtitel) und optional `helpContext` (blendet den Hilfe-Knopf ein).
 */
const MyModalHeader: FC<{ title: string; helpContext?: HelpContextKey }> = ({ title, helpContext }) => {
  const kontext = useContext(DialogKontext);
  const hilfe = helpContext && (
    <DBButton
      type="button"
      variant="ghost"
      icon="question_mark_circle"
      noText
      aria-label="Hilfe anzeigen"
      onClick={() => invokeHook('help:open', helpContext)}
    >
      <DBTooltip>Hilfe anzeigen</DBTooltip>
    </DBButton>
  );
  return kontext?.vollbild ? (
    <DBDrawerHeader text={title} closeButtonText="Schließen" endSlot={hilfe} />
  ) : (
    <DBDialogHeader text={title} closeButtonText="Schließen" endSlot={hilfe} />
  );
};
export default MyModalHeader;
