import { Column, Row } from "../../class/CustomTable";
import { MyCheckbox, MyDivModal, MyModalBody, MyShowElement, MyShowFooter, showModal } from "../../components";
import type { CustomHTMLDivElement, IDatenEWT } from "../../interfaces";
import { saveTableDataEWT } from "../utils";

const getColumn = (row: Row<IDatenEWT>, columnName: string): Column<IDatenEWT> => {
	const column = row.columns.array.find(column => column.name === columnName);
	if (!column) throw Error(`Spalte ${columnName} nicht gefunden`);
	return column;
};

const createTagElement = (row: Row<IDatenEWT>) => {
	const column: Column<IDatenEWT> = getColumn(row, "tagE");
	return (
		<MyShowElement
			divClass="mb-1 col-6"
			labelClass="col-5 col-form-label text-wrap fw-bold ps-2"
			spanClass="col-2 align-middle text-break my-auto"
			title={`${column.title}:`}
			id="tagE"
			text={column.parser(row.cells["tagE"])}
		/>
	);
};

const createOrtSchichtElement = (row: Row<IDatenEWT>, columnName: string) => {
	const column: Column<IDatenEWT> = getColumn(row, columnName);
	return (
		<MyShowElement
			labelClass="col-4 col-sm-5 col-form-label text-wrap fw-bold"
			spanClass="col-8 col-sm-7 align-middle text-break my-auto"
			title={`${column.title}:`}
			id={column.name}
			text={column.parser(row.cells[column.name]) ?? "\u00A0"}
		/>
	);
};

const createTitle = (vor: string, text: string, nach: string) => (
	<div className="icon-ewt">
		<span className="col-1 text-center">{vor}</span>
		<h5 className="col-6 text-center mb-1 text-truncate">{text}</h5>
		<span className="col-1 text-center">{nach}</span>
	</div>
);

const createShowElement = (row: Row<IDatenEWT>, columnName: string) => {
	const column: Column<IDatenEWT> = getColumn(row, columnName);
	return (
		<div className="mb-1 col-6 text-center">
			<span id={column.name}>{column.parser(row.cells[column.name])}</span>
		</div>
	);
};

export default function ShowModalEWT(row: Row<IDatenEWT>, titel: string): void {
	const modal: CustomHTMLDivElement<IDatenEWT> = showModal(
		<MyDivModal size="sm" title={titel} Footer={<MyShowFooter row={row} />}>
			<MyModalBody>
				{createTagElement(row)}
				<MyCheckbox
					className="form-check form-switch col-5"
					id={"berechnen"}
					checked={row.cells?.["berechnen"] ?? true}
					changeHandler={(e: Event) => {
						const row = ((e.target as HTMLInputElement).closest(".modal") as CustomHTMLDivElement<IDatenEWT>)
							.row as Row<IDatenEWT>;
						row.cells.berechnen = (e.target as HTMLInputElement).checked;
						const table = row.CustomTable;
						table.drawRows();
						saveTableDataEWT(table);
					}}
				>
					{row.columns.array.find(column => column.name === "berechnen")?.title ?? "Berechnen?"}
				</MyCheckbox>
				{createOrtSchichtElement(row, "eOrtE")}
				{createOrtSchichtElement(row, "schichtE")}
				<hr />

				<div className="icon-ewt-arrow">
					<span className="material-icons-round big-icons">arrow_downward</span>
					<span className="material-icons-round big-icons">arrow_upward</span>
				</div>

				{createTitle("ab", "Wohnung", "an")}
				{createShowElement(row, "abWE")}
				{createShowElement(row, "anWE")}

				{createTitle("von", "Arbeitszeit", "bis")}
				{createShowElement(row, "beginE")}
				{createShowElement(row, "endeE")}

				{createTitle("ab", "1. Tätigkeitsstätte", "an")}
				{createShowElement(row, "ab1E")}
				{createShowElement(row, "an1E")}

				{createTitle("an", "Einsatzort", "ab")}
				{createShowElement(row, "anEE")}
				{createShowElement(row, "abEE")}
			</MyModalBody>
		</MyDivModal>,
	);

	modal.row = row;
}
