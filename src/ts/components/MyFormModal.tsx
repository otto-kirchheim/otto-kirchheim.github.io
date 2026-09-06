import { type FC } from 'react';

import type { TMyModal } from '@/types';
import { MyEditorFooter, MyModalHeader } from '.';

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
      <div className="alert alert-danger mx-3 mt-3 mb-0 py-2" role="alert">
        <span className="db-icon align-middle me-1 db-font-size-sm" data-icon="exclamation_mark_circle" />
        {errorMessage}
      </div>
    )}
    {children}
    {Footer ?? <MyEditorFooter submitText={submitText} customButtons={customButtons} />}
  </form>
);

export default MyFormModal;
