import { type FC } from 'react';

import type { TMyModal } from '@/types';
import { MyEditorFooter, MyModalHeader } from '.';
import { DBNotification } from '@db-ux/react-core-components';

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
  <form ref={myRef} onSubmit={onSubmit} className="dialog-rumpf" data-breite={size}>
    {Header ?? <MyModalHeader title={title} helpContext={helpContext} />}
    {errorMessage && (
      <DBNotification semantic="critical" role="alert" className="mx-3 mt-3 mb-0 py-2">
        {errorMessage}
      </DBNotification>
    )}
    {children}
    {Footer ?? <MyEditorFooter submitText={submitText} customButtons={customButtons} />}
  </form>
);

export default MyFormModal;
