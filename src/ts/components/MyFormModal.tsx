import type { FunctionalComponent } from 'preact';
import type { TMyModal } from '@/types';
import { MyEditorFooter, MyModalHeader } from '.';

const MyFormModal: FunctionalComponent<TMyModal<HTMLFormElement>> = ({
  size,
  myRef,
  onSubmit,
  title,
  Header,
  children,
  Footer,
  submitText,
  customButtons,
  errorMessage,
}) => (
  <div className={size ? `modal-dialog modal-${size}` : 'modal-dialog'}>
    <form ref={myRef} onSubmit={onSubmit} className="modal-content">
      {Header ?? <MyModalHeader title={title} />}
      {errorMessage && (
        <div className="alert alert-danger mx-3 mt-3 mb-0 py-2" role="alert">
          <span className="material-icons-round align-middle me-1" style="font-size:1rem">error</span>
          {errorMessage}
        </div>
      )}
      {children}
      {Footer ?? <MyEditorFooter submitText={submitText} customButtons={customButtons} />}
    </form>
  </div>
);

export default MyFormModal;
