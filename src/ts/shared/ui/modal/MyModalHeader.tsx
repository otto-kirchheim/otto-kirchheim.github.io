import { DBButton, DBDialogHeader, DBDrawerHeader, DBTooltip } from '@db-ux/react-core-components';
import { type FC } from 'react';

import type { HelpContextKey } from '@/shared/lib/help/helpContent';
import { invokeHook } from '@/shared/lib/feature';
import { useVollbild } from '@/shared/ui/modal/DialogKontext';

/**
 * Kopfzeile der Dialoge (`DBDrawerHeader` im Vollbild-Drawer auf dem Handy, sonst `DBDialogHeader`; siehe `DialogKontext`):
 * Titel links, optional Hilfe-Knopf, Schliessen-Knopf rechts. Der Header verknuepft den `<dialog>` selbst per
 * `aria-labelledby` mit der Ueberschrift; sein Schliessen-Knopf loest `onClose` aus.
 *
 * Props: `title` (Dialogtitel), optional `helpContext` (blendet den Hilfe-Knopf ein) und `zusatz` (Kennung hinter dem Titel,
 * z. B. eine gekuerzte Id).
 */
const MyModalHeader: FC<{ title: string; helpContext?: HelpContextKey; zusatz?: string }> = ({
  title,
  helpContext,
  zusatz,
}) => {
  const vollbild = useVollbild();
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
  const titelInhalt = zusatz ? (
    <h2>
      {title}
      <code className="luft-links-xs farbe-gedaempft titel-code">{zusatz}</code>
    </h2>
  ) : undefined;
  return vollbild ? (
    <DBDrawerHeader text={titelInhalt ? undefined : title} closeButtonText="Schließen" endSlot={hilfe}>
      {titelInhalt}
    </DBDrawerHeader>
  ) : (
    <DBDialogHeader text={titelInhalt ? undefined : title} closeButtonText="Schließen" endSlot={hilfe}>
      {titelInhalt}
    </DBDialogHeader>
  );
};
export default MyModalHeader;
