import type { FunctionalComponent } from 'preact';
import type { TMyModal } from '@/types';
import { MyModalHeader, MyEditorFooter } from '.';

const MyDivModal: FunctionalComponent<Omit<TMyModal<HTMLDivElement>, 'myRef' | 'onSubmit'>> = ({
  size,
  title,
  Header,
  children,
  Footer,
  submitText,
  customButtons,
  errorMessage,
}) => (
  <div className={'modal-dialog'}>
    <div className={size ? `modal-content modal-${size}` : 'modal-content'}>
      {Header ?? <MyModalHeader title={title} />}
      {errorMessage && (
        <div className="alert alert-danger mx-3 mt-3 mb-0 py-2" role="alert">
          <span className="material-icons-round align-middle me-1" style="font-size:1rem">error</span>
          {errorMessage}
        </div>
      )}
      {children}
      {Footer ?? <MyEditorFooter submitText={submitText} customButtons={customButtons} />}
    </div>
  </div>
);

export default MyDivModal;
