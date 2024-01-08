import { JSX } from "preact";
import { Column, Row } from "../../class/CustomTable";
import { MyDivModal, MyModalBody, MyShowElement, MyShowFooter, showModal } from "../../components";
import type { CustomHTMLDivElement, IDatenN } from "../../interfaces";

const getColumn = (row: Row<IDatenN>, columnName: string): Column<IDatenN> => {
	const column = row.columns.array.find(column => column.name === columnName);
	if (!column) throw Error(`Spalte ${columnName} nicht gefunden`);
	return column;
};

const createTagElement = (row: Row<IDatenN>) => {
	const column: Column<IDatenN> = getColumn(row, "tagN");
	return (
		<MyShowElement
			divClass="mb-2 col-12 text-center"
			labelClass="pe-3 align-middle col-form-label text-wrap fw-bold"
			spanClass="align-middle my-auto"
			title={`${column.title}:`}
			id="tagN"
			text={column.parser(row.cells["tagN"])}
		/>
	);
};

const createShowElement = (
	row: Row<IDatenN>,
	column_1: [columnName: string, className?: string],
	column_2: [columnName: string, className?: string],
	classNameDiv: string = "mb-2 col-12 text-center",
	separator: JSX.Element = <span className="material-icons-round big-icons">arrow_right_alt</span>,
) => {
	const column1: Column<IDatenN> = getColumn(row, column_1[0]);
	const column2: Column<IDatenN> = getColumn(row, column_2[0]);
	return (
		<div className={classNameDiv}>
			<span className={column_1[1]} id={column1.name}>
				{column1.parser(row.cells[column1.name])}
			</span>
			{separator}
			<span className={column_2[1]} id={column2.name}>
				{column2.parser(row.cells[column2.name])}
			</span>
		</div>
	);
};

const createShowElement2 = (
	row: Row<IDatenN>,
	column: [columnName: string, className?: string],
	classNameDiv: string = "mb-2 col-12 text-center",
) => {
	const column1: Column<IDatenN> = getColumn(row, column[0]);

	return (
		<div className={classNameDiv}>
			<span className={column[1]} id={column1.name}>
				{`${column1.title} x `}
			</span>

			<span className={column[1]} id={column1.name}>
				{column1.parser(row.cells[column1.name])}
			</span>
		</div>
	);
};

const createShowElement3 = (
	row: Row<IDatenN>,
	column: [columnName: string, className?: string],
	classNameDiv: string = "mb-2 col-12 text-center",
) => {
	const column1: Column<IDatenN> = getColumn(row, column[0]);

	return (
		<div className={classNameDiv}>
			<span className={column[1]} id={column1.name}>
				{column1.parser(row.cells[column1.name])}
			</span>
		</div>
	);
};

export default function ShowModalNeben(row: Row<IDatenN>, titel: string): void {
	const modal: CustomHTMLDivElement<IDatenN> = showModal(
		<MyDivModal size="sm" title={titel} Footer={<MyShowFooter row={row} />}>
			<MyModalBody className="p-3">
				{createTagElement(row)}

				<h4 className="text-center mb-0">Auftragsnummer</h4>
				{createShowElement3(row, ["auftragN"])}

				<h4 className="text-center mb-0">Arbeitszeit</h4>
				{createShowElement(row, ["beginN"], ["endeN"])}

				<h4 className="text-center mb-0">Zulage</h4>
				{createShowElement2(row, ["anzahl040N", "col-6 align-middle text-break my-auto"])}
			</MyModalBody>
		</MyDivModal>,
	);

	modal.row = row;
}
