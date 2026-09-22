import { DBButton } from '@db-ux/react-core-components';
import type { CustomTableTypes, Row } from '@/shared/ui/custom-table/CustomTable';

/**
 * Fussleiste des Anzeige-Dialogs einer Tabellenzeile: Bearbeiten, Loeschen, Schliessen. Alle drei
 * schliessen den Dialog (`data-dialog-dismiss`); Bearbeiten und Loeschen rufen danach die
 * Editier-Aktionen der Tabelle auf.
 *
 * @typeParam T - Datentyp der Tabelle.
 * Props: `row`: die angezeigte Tabellenzeile.
 */
function MyShowFooter<T extends CustomTableTypes>({ row }: { row: Row<T> }) {
  /** Oeffnet den Editor der Zeile. */
  const editClickHandler = () => {
    row.CustomTable.options.editing.editRow(row);
  };

  /** Loest das Loeschen der Zeile ueber die Tabellenoptionen aus. */
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
