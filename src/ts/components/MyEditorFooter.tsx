import { DBButton } from '@db-ux/react-core-components';
import { type FC, type ReactNode } from 'react';

type TMyModalFooter = {
  customButtons?: ReactNode[];
  submitText?: string;
};
/**
 * Standard-Fußzeile eines Dialogs: Submit-Button, optionale Zusatz-Buttons und "Abbrechen", das den Dialog über `data-dialog-dismiss` schließt.
 *
 * @param props - `submitText` (Beschriftung des Submit-Buttons, Standard "Hinzufügen") und `customButtons` (zusätzliche Buttons zwischen Submit und Abbrechen).
 */
const MyEditorFooter: FC<TMyModalFooter> = ({ customButtons = [], submitText = 'Hinzufügen' }) => {
  return (
    <div className="dialog-fuss">
      <DBButton type="submit" variant="brand">
        {submitText}
      </DBButton>
      {customButtons}
      <DBButton type="button" variant="filled" data-dialog-dismiss="modal">
        Abbrechen
      </DBButton>
    </div>
  );
};
export default MyEditorFooter;
