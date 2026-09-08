import { MyButton } from '.';
import type { CustomTableTypes, Row } from '@/infrastructure/table/CustomTable';

function MyShowFooter<T extends CustomTableTypes>({ row }: { row: Row<T> }) {
  const editClickHandler = () => {
    row.CustomTable.options.editing.editRow(row);
  };

  const deleteClickHandler = () => {
    row.CustomTable.options.editing.deleteRow(row);
  };

  return (
    <div className="dialog-fuss">
      <MyButton text="Bearbeiten" dialogDismiss="modal" clickHandler={editClickHandler} />
      <MyButton
        className="db-button"
        data-variant="filled"
        data-color="critical"
        text="Löschen"
        dialogDismiss="modal"
        clickHandler={deleteClickHandler}
      />
      <MyButton className="db-button" data-variant="filled" text="Schließen" dialogDismiss="modal" />
    </div>
  );
}
export default MyShowFooter;
