import Modal from "bootstrap/js/dist/modal";
import { createRef } from "preact";
import { Column, CustomTable, Row } from "../../class/CustomTable";
import { MyFormModal, MyInput, MyModalBody, MySelect, showModal } from "../../components";
import type { CustomHTMLDivElement, IDatenN } from "../../interfaces";
import { Storage, checkMaxTag, saveTableDataN } from "../../utilities";
import dayjs from "../../utilities/configDayjs";

const getColumn = (row: CustomTable<IDatenN> | Row<IDatenN>, columnName: string): Column<IDatenN> => {
	const column = row.columns.array.find(column => column.name === columnName);
	if (!column) throw Error(`Spalte ${columnName} nicht gefunden`);
	return column;
};

const createTimeElement = (
	row: CustomTable<IDatenN> | Row<IDatenN>,
	columnName: string,
	options?: { required?: boolean },
) => {
	const column = getColumn(row, columnName);
	return (
		<MyInput
			divClass="form-floating col-6 pb-3"
			type="time"
			id={column.name}
			name={column.title}
			value={row instanceof Row ? row.cells[column.name] : ""}
			{...options}
		>
			{column.title}
		</MyInput>
	);
};

const createNumberElement = (row: CustomTable<IDatenN> | Row<IDatenN>, columnName: string) => {
	const column = getColumn(row, columnName);
	return (
		<MyInput
			divClass="form-floating col-6 pb-3"
			type="number"
			id={column.name}
			name={column.title}
			value={row instanceof Row ? row.cells[column.name] : 1}
			required
			min={1}
			max={1}
		>
			{column.title}
		</MyInput>
	);
};

const createSelectElement = (row: CustomTable<IDatenN> | Row<IDatenN>, columnName: string) => {
	const column = getColumn(row, columnName);
	return (
		<MySelect
			className="form-floating col-6 pb-3"
			id={column.name}
			title={column.title}
			value={row instanceof Row ? row.cells[column.name].toString() : undefined}
			required
			options={[{ value: "040 Fahrentsch.", text: "040 Fahrentsch.", selected: true }]}
		/>
	);
};

export default function EditorModalNeben(row: CustomTable<IDatenN> | Row<IDatenN>, titel: string): void {
	const ref = createRef<HTMLFormElement>();

	const Monat: number = Storage.get<number>("Monat", { check: true }) - 1;
	const Jahr: number = Storage.get<number>("Jahr", { check: true });

	let Tag: number;
	if (row instanceof Row) Tag = Number(row.cells.tagN);
	else if (row instanceof CustomTable) Tag = checkMaxTag(Jahr, Monat);
	else throw new Error("unbekannter Fehler");

	const datum = dayjs([Jahr, Monat, Tag]);

	const modal: CustomHTMLDivElement<IDatenN> = showModal(
		<MyFormModal
			myRef={ref}
			title={titel}
			submitText={row instanceof Row ? "Speichern" : undefined}
			onSubmit={onSubmit()}
		>
			<MyModalBody>
				<MyInput
					divClass="form-floating col-6 pb-3"
					required
					type="date"
					id="tagN"
					name={row.columns.array.find(column => column.name === "tagN")?.title ?? "Tag"}
					min={datum.startOf("M").format("YYYY-MM-DD")}
					max={datum.endOf("M").format("YYYY-MM-DD")}
					value={datum.format("YYYY-MM-DD")}
				>
					{row.columns.array.find(column => column.name === "tagN")?.title ?? "Tag"}
				</MyInput>

				<h4 className="text-center mb-1">Arbeitszeit</h4>
				{["beginN", "endeN"].map(value => createTimeElement(row, value, { required: true }))}

				<h4 className="text-center mb-1">Pause</h4>
				{["beginPauseN", "endePauseN"].map(value => createTimeElement(row, value))}

				<h4 className="text-center mb-1">Zulage</h4>
				{createNumberElement(row, "dauerN")}
				{createSelectElement(row, "nrN")}
			</MyModalBody>
		</MyFormModal>,
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
			const table = row instanceof Row ? row.CustomTable : row;

			const values: {
				tagN: string;
				beginN: string;
				endeN: string;
				beginPauseN: string;
				endePauseN: string;
				nrN: string;
				dauerN: number;
			} = {
				tagN: dayjs(form.querySelector<HTMLInputElement>("#tagN")?.value ?? 0).format("DD"),
				beginN: form.querySelector<HTMLInputElement>("#beginN")?.value ?? "",
				endeN: form.querySelector<HTMLInputElement>("#endeN")?.value ?? "",
				beginPauseN: form.querySelector<HTMLInputElement>("#beginPauseN")?.value ?? "",
				endePauseN: form.querySelector<HTMLInputElement>("#endePauseN")?.value ?? "",
				nrN: form.querySelector<HTMLInputElement>("#nrN")?.value ?? "",
				dauerN: Number(form.querySelector<HTMLInputElement>("#dauerN")?.value) || 0,
			};
			row instanceof Row ? row.val(values) : row.rows.add(values);

			Modal.getInstance(modal)?.hide();
			saveTableDataN(table);
		};
	}
}
