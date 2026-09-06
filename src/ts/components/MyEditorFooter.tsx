import { type FC, type ReactNode } from 'react';

import { MyButton } from '.';

type TMyModalFooter = {
  customButtons?: ReactNode[];
  submitText?: string;
};
const MyEditorFooter: FC<TMyModalFooter> = ({ customButtons = [], submitText = 'Hinzufügen' }) => {
  return (
    <div className="dialog-fuss">
      <MyButton type="submit" text={submitText} />
      {customButtons}
      <MyButton className="db-button" data-variant="filled" dataBsDismiss="modal" text="Abbrechen" />
    </div>
  );
};
export default MyEditorFooter;
