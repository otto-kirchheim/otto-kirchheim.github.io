import { type FC } from 'react';

import type { TMyModal } from '@/types';
import { MyModalHeader, MyEditorFooter } from '.';
import { DBNotification } from '@db-ux/react-core-components';

/**
 * Dialog-Rumpf als `div` für Modals ohne Formular (z. B. Anzeige- und Hilfedialoge).
 * Ohne eigenen `Header`/`Footer` kommen `MyModalHeader` und `MyEditorFooter` zum Einsatz; `errorMessage` erscheint als kritische Meldung über dem Inhalt.
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
  <div className="dialog-rumpf" data-breite={size}>
    {Header ?? <MyModalHeader title={title} helpContext={helpContext} />}
    {errorMessage && (
      <DBNotification semantic="critical" role="alert" className="mx-3 mt-3 mb-0 py-2">
        {errorMessage}
      </DBNotification>
    )}
    {children}
    {Footer ?? <MyEditorFooter submitText={submitText} customButtons={customButtons} />}
  </div>
);

export default MyDivModal;
