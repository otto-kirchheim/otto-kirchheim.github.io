import { type FC } from 'react';

import type { TMyModal } from '@/types';
import MyDialog from '@/shared/ui/modal/MyDialog';
import MyModalHeader from '@/shared/ui/modal/MyModalHeader';
import MyEditorFooter from '@/shared/ui/modal/MyEditorFooter';
import { DBNotification } from '@db-ux/react-core-components';

/**
 * Dialog ohne Formular (z. B. Anzeige- und Hilfedialoge) als `DBDialog`.
 * Ohne eigenen `Header`/`Footer` kommen `MyModalHeader` und `MyEditorFooter` zum Einsatz; `errorMessage` erscheint als kritische Meldung ueber dem Inhalt.
 *
 * @param props - Modal-Props ohne `myRef`/`onSubmit`: `title`, `size`, `helpContext`, `Header`, `Footer`, `submitText`, `customButtons`, `errorMessage`, `children`.
 */
const MyDivModal: FC<Omit<TMyModal<HTMLDivElement>, 'myRef' | 'onSubmit'>> = ({
  size,
  title,
  helpContext,
  Header,
  children,
  Footer,
  submitText,
  customButtons,
  errorMessage,
}) => (
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
);

export default MyDivModal;
