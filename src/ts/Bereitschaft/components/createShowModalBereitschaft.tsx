import { Column, CustomTableTypes, Row } from "../../class/CustomTable";
import { MyDivModal, MyModalBody, MyShowFooter, showModal } from "../../components";
import type { CustomHTMLDivElement, IDatenBE, IDatenBZ } from "../../interfaces";

const createShowElement = <T extends CustomTableTypes = IDatenBZ | IDatenBE>(column: Column<T>, row: Row<T>) => {
	if (column.editing) return;
	return (
		<div className="mb-1 row">
			<label className="col-5 col-form-label text-wrap fw-bold" htmlFor={column.name}>
				{column.title}
			</label>
			<span className="col-7 align-middle text-break my-auto" id={column.name}>
				{column.parser(row.cells[column.name])}
			</span>
		</div>
	);
};

export default function ShowModalBereitschaft<T extends CustomTableTypes = IDatenBZ | IDatenBE>(
	row: Row<T>,
	titel: string,
): void {
	const modal: CustomHTMLDivElement<T> = showModal<T>(
		<MyDivModal size="sm" title={titel} Footer={<MyShowFooter row={row} />}>
			<MyModalBody>{row.columns.array.map(column => createShowElement<T>(column, row))}</MyModalBody>
		</MyDivModal>,
	);

	modal.row = row;
}
