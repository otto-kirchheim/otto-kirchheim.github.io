import { type FC } from 'react';

import type { TMyModal } from '@/types';
import MyDialog from '@/shared/ui/modal/MyDialog';
import MyEditorFooter from '@/shared/ui/modal/MyEditorFooter';
import MyModalHeader from '@/shared/ui/modal/MyModalHeader';
import { DBNotification } from '@db-ux/react-core-components';

/**
 * Dialog mit Eingaben: ein `DBDialog` in einem `form`. Der `<dialog>` liegt im Formular, deshalb gehoeren Submit-Knoepfe in
 * Header-/Footer-Slot trotzdem zum Formular.
 * Ohne eigenen `Header`/`Footer` kommen `MyModalHeader` und `MyEditorFooter` zum Einsatz; `errorMessage` erscheint als kritische Meldung ueber dem Inhalt.
 *
 * @param props - Modal-Props (`TMyModal`): `myRef` und `onSubmit` gehoeren zum `form`, dazu `title`, `size`, `helpContext`, `Header`, `Footer`, `submitText`, `customButtons`, `errorMessage`, `children`.
 */
const MyFormModal: FC<TMyModal<HTMLFormElement>> = ({
  size,
  myRef,
  onSubmit,
  title,
  helpContext,
  Header,
  children,
  Footer,
  submitText,
  customButtons,
  errorMessage,
}) => (
  <form ref={myRef} onSubmit={onSubmit}>
    <MyDialog
      size={size}
      header={Header ?? <MyModalHeader title={title} helpContext={helpContext} />}
      footer={Footer ?? <MyEditorFooter submitText={submitText} customButtons={customButtons} />}
    >
      {errorMessage && (
        <DBNotification semantic="critical" role="alert" className="dialog-fehler">
          {errorMessage}
        </DBNotification>
      )}
      {children}
    </MyDialog>
  </form>
);

export default MyFormModal;
