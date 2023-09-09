import { Row } from "../../class/CustomTable";
import { MyDivModal, MyModalBody, MyShowElement, MyShowFooter, showModal } from "../../components";
import type { CustomHTMLDivElement, IVorgabenUvorgabenB } from "../../interfaces";

const createShowElement = (row: Row<IVorgabenUvorgabenB>, columnName: string, falseparser?: false) => {
	const column = row.columns.array.find(column => column.name === columnName);
	if (!column) throw Error(`Spalte ${columnName} nicht gefunden`);
	return (
		<MyShowElement
			divClass="mb-1"
			labelClass="col-3 col-form-label text-wrap fw-bold"
			spanClass="col-9 align-middle text-break my-auto"
			title={`${column.title}:`}
			id={column.name}
			text={column.parser(row.cells[column.name], falseparser)}
		/>
	);
};

const fixedColumns = ["Name", "standard"];
const dynamicColumns = ["beginnB", "endeB", "nacht", "beginnN", "endeN"];

export default function ShowModalVE(row: Row<IVorgabenUvorgabenB>, titel: string): void {
	const modal: CustomHTMLDivElement<IVorgabenUvorgabenB> = showModal<IVorgabenUvorgabenB>(
		<MyDivModal title={titel} Footer={<MyShowFooter row={row} />}>
			<MyModalBody>
				{fixedColumns.map(name => createShowElement(row, name))}
				{dynamicColumns.map(name => createShowElement(row, name, false))}
			</MyModalBody>
		</MyDivModal>,
	);

	modal.row = row;
}
