import { MyButton } from '.';
import type { CustomTableTypes, Row } from '../infrastructure/table/CustomTable';

function MyShowFooter<T extends CustomTableTypes>({ row }: { row: Row<T> }) {
  const editClickHandler = () => {
    row.CustomTable.options.editing.editRow(row);
  };

  const deleteClickHandler = () => {
    row.CustomTable.options.editing.deleteRow(row);
  };

  return (
    <div className="modal-footer">
      <MyButton text="Bearbeiten" dataBsDismiss="modal" clickHandler={editClickHandler} />
      <MyButton className="btn btn-danger" text="Löschen" dataBsDismiss="modal" clickHandler={deleteClickHandler} />
      <MyButton className="btn btn-secondary" text="Schließen" dataBsDismiss="modal" />
    </div>
  );
}
export default MyShowFooter;
