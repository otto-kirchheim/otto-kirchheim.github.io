import type { ComponentChild, FunctionalComponent } from 'preact';
import { MyButton } from '.';

type TMyModalFooter = {
  customButtons?: ComponentChild[];
  submitText?: string;
};
const MyEditorFooter: FunctionalComponent<TMyModalFooter> = ({ customButtons = [], submitText = 'Hinzufügen' }) => {
  return (
    <div className="modal-footer">
      <MyButton type="submit" text={submitText} />
      {customButtons}
      <MyButton className="btn btn-secondary" dataBsDismiss="modal" text="Abbrechen" />
    </div>
  );
};
export default MyEditorFooter;
