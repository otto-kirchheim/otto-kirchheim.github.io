import type { FunctionalComponent } from 'preact';

const MyModalHeader: FunctionalComponent<{ title: string }> = ({ title }) => {
  return (
    <div className="modal-header">
      <h5 className="modal-title">{title}</h5>
      <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Schließen"></button>
    </div>
  );
};
export default MyModalHeader;
