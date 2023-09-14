import { FunctionalComponent } from "preact";
import { MyButton } from ".";
import { Row } from "../class/CustomTable";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MyShowFooter: FunctionalComponent<{ row: Row<any> }> = ({ row }) => {
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
};
export default MyShowFooter;
