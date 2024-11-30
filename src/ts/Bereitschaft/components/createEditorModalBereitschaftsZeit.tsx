import Modal from "bootstrap/js/dist/modal";
import { ComponentChild, ComponentChildren, createRef } from "preact";
import { Column, CustomTable, Row } from "../../class/CustomTable";
import { MyFormModal, MyInput, MyModalBody, showModal } from "../../components";
import type { CustomHTMLDivElement, IDatenBZ } from "../../interfaces";
import { Storage, checkMaxTag } from "../../utilities";
import dayjs from "../../utilities/configDayjs";
import { saveTableDataBZ } from "../utils";

const createElementRow = (column: Column<IDatenBZ>, row: Row<IDatenBZ>): ComponentChild => {
	let datum: dayjs.Dayjs, min: string, max: string;
	switch (column.name) {
		case "editing":
			return;
		case "beginB":
		case "endeB":
			datum = dayjs(row.cells[column.name]);
			min = datum.startOf("M").format("YYYY-MM-DDTHH:mm");
			max = datum.add(1, "M").startOf("M").format("YYYY-MM-DDTHH:mm");
			return (
				<MyInput
					divClass="form-floating col-12 pb-3"
					type="datetime-local"
					id={column.name}
					name={column.title}
					required
					min={min}
					max={max}
					value={dayjs(row.cells[column.name]).format("YYYY-MM-DDTHH:mm")}
				>
					{column.title}
				</MyInput>
			);
		default:
			return (
				<MyInput
					divClass="form-floating col-12"
					type="number"
					id={column.name}
					name={column.title}
					min={"0"}
					max={"60"}
					value={column.parser(row.cells[column.name])}
				>
					{column.title}
				</MyInput>
			);
	}
};

const createElementCustomtable = (column: Column<IDatenBZ>, Monat: number, Jahr: number): ComponentChild => {
	let datum, min, max;
	switch (column.name) {
		case "editing":
			return;
		case "beginB":
		case "endeB":
			datum = dayjs([Jahr, Monat - 1, checkMaxTag(Jahr, Monat - 1)]);
			min = datum.startOf("M").format("YYYY-MM-DDTHH:mm");
			max = datum.add(1, "M").startOf("M").format("YYYY-MM-DDTHH:mm");
			return (
				<MyInput
					divClass="form-floating col-12 pb-3"
					type="datetime-local"
					id={column.name}
					name={column.title}
					required
					min={min}
					max={max}
				>
					{column.title}
				</MyInput>
			);
		default:
			return (
				<MyInput divClass="form-floating col-12" type="number" id={column.name} name={column.title} min={"0"} max={"60"}>
					{column.title}
				</MyInput>
			);
	}
};

const createElements = (row: CustomTable<IDatenBZ> | Row<IDatenBZ>): ComponentChildren => {
	if (row instanceof Row) {
		return row.columns.array.map(column => createElementRow(column, row));
	} else if (row instanceof CustomTable) {
		const Monat: number = Storage.get<number>("Monat", { check: true });
		const Jahr: number = Storage.get<number>("Jahr", { check: true });
		return row.columns.array.map(column => createElementCustomtable(column, Monat, Jahr));
	} else throw new Error("unbekannter Fehler");
};

export default function EditorModalBereitschaftsZeit(row: CustomTable<IDatenBZ> | Row<IDatenBZ>, titel: string): void {
	const ref = createRef<HTMLFormElement>();

	const modal: CustomHTMLDivElement<IDatenBZ> = showModal(
		<MyFormModal
			myRef={ref}
			size="sm"
			title={titel}
			submitText={row instanceof Row ? "Speichern" : undefined}
			onSubmit={onSubmit()}
		>
			<MyModalBody>{createElements(row)}</MyModalBody>
		</MyFormModal>
	);

	if (ref.current === null) throw new Error("referenz nicht gesetzt");
	const form = ref.current;

	modal.row = row;

	function onSubmit(): (event: Event) => void {
		return (event: Event): void => {
			if (!form.checkValidity()) return;
			event.preventDefault();

			const row = modal.row;
			if (!row) throw new Error("Row nicht gefunden");
			const table: CustomTable<IDatenBZ> = row instanceof Row ? row.CustomTable : row;

			const values: IDatenBZ = {
				beginB: dayjs(form.querySelector<HTMLInputElement>("#beginB")?.value).toISOString(),
				endeB: dayjs(form.querySelector<HTMLInputElement>("#endeB")?.value).toISOString(),
				pauseB: Number(form.querySelector<HTMLInputElement>("#pauseB")?.value),
			};

			row instanceof Row ? row.val(values) : row.rows.add(values);

			Modal.getInstance(modal)?.hide();
			saveTableDataBZ(table);
		};
	}
}
