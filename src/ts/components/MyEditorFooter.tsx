import { type FC, type ReactNode } from 'react';

import { MyButton } from '.';

type TMyModalFooter = {
  customButtons?: ReactNode[];
  submitText?: string;
};
const MyEditorFooter: FC<TMyModalFooter> = ({ customButtons = [], submitText = 'Hinzufügen' }) => {
  return (
    <div className="modal-footer">
      <MyButton type="submit" text={submitText} />
      {customButtons}
      <MyButton className="btn btn-secondary" dataBsDismiss="modal" text="Abbrechen" />
    </div>
  );
};
export default MyEditorFooter;
