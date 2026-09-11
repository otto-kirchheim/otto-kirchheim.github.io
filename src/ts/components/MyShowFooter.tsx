import { DBButton } from '@db-ux/react-core-components';
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
      {/* Farb-Konvention: Primaeraktion = `brand`, destruktiv = `outlined`+`critical`
          (weniger Gewicht als die Primaeraktion), neutral/schliessen = `filled`. */}
      <DBButton type="button" variant="brand" data-dialog-dismiss="modal" onClick={editClickHandler}>
        Bearbeiten
      </DBButton>
      <DBButton
        type="button"
        variant="outlined"
        data-color="critical"
        data-dialog-dismiss="modal"
        onClick={deleteClickHandler}
      >
        Löschen
      </DBButton>
      <DBButton type="button" variant="filled" data-dialog-dismiss="modal">
        Schließen
      </DBButton>
    </div>
  );
}
export default MyShowFooter;
