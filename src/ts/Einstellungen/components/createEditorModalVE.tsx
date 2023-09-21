import Modal from "bootstrap/js/dist/modal";
import { Fragment, createRef } from "preact";
import { CustomTable, Row } from "../../class/CustomTable";
import { MyCheckbox, MyFormModal, MyInput, MyModalBody, MySelect, showModal } from "../../components";
import type { IVorgabenUvorgabenB } from "../../interfaces";
import { saveTableDataVorgabenU } from "../utils";

type vorgabenBElement = { tag: number; zeit: string; Nwoche: boolean };

const createNameElement = (row: Row<IVorgabenUvorgabenB> | CustomTable<IVorgabenUvorgabenB>) => {
	const column = row.columns.array.find(column => column.name === "Name");
	if (!column) throw Error(`Spalte "Name" nicht gefunden`);

	const value: string = row instanceof Row ? (row.cells[column.name] as string) : "";

	return (
		<MyInput divClass="form-floating col-12 pb-3" required type="text" id={column.name} name={column.title} value={value}>
			{column.title}
		</MyInput>
	);
};
const createcheckboxElement = (
	row: Row<IVorgabenUvorgabenB> | CustomTable<IVorgabenUvorgabenB>,
	columnName: string,
) => {
	const column = row.columns.array.find(column => column.name === columnName);
	if (!column) throw Error(`Spalte ${columnName} nicht gefunden`);

	const isChecked: boolean = row instanceof Row ? (row.cells?.[column.name] as boolean) : false;

	return (
		<MyCheckbox className="form-check form-switch col-12 pb-3" id={column.name} checked={isChecked}>
			{column.title}
		</MyCheckbox>
	);
};

const createVariableElement = (
	row: Row<IVorgabenUvorgabenB> | CustomTable<IVorgabenUvorgabenB>,
	columnName: string,
) => {
	const column = row.columns.array.find(column => column.name === columnName);
	if (!column) throw Error(`Spalte ${columnName} nicht gefunden`);

	const selectValue: number = row instanceof Row ? (row.cells?.[column.name] as vorgabenBElement).tag : -1;
	const inputValue: string = row instanceof Row ? (row.cells?.[column.name] as vorgabenBElement).zeit : "";
	const checkBoxState: boolean = row instanceof Row ? (row.cells?.[column.name] as vorgabenBElement).Nwoche : false;

	return (
		<Fragment>
			<MySelect
				className={`form-floating col-7 col-sm-6 ${columnName === "beginnB" ? "pb-3" : ""}`}
				required
				id={`${column.name}Tag`}
				title={column.title}
				value={selectValue}
				options={[
					{ value: 1, text: "Montag" },
					{ value: 2, text: "Dienstag" },
					{ value: 3, text: "Mittwoch" },
					{ value: 4, text: "Donnerstag" },
					{ value: 5, text: "Freitag" },
					{ value: 6, text: "Samstag" },
					{ value: 0, text: "Sonntag" },
				]}
			/>
			<MyInput
				divClass={`form-floating col-5 col-sm-6 ${columnName === "beginnB" ? "pb-3" : ""}`}
				required
				type="time"
				id={`${column.name}Zeit`}
				name={column.title}
				value={inputValue}
			>
				{column.title}
			</MyInput>
			{columnName === "beginnB" ? (
				[]
			) : (
				<MyCheckbox className="form-check form-switch col-12 pb-3" id={`${column.name}Nwoche`} checked={checkBoxState}>
					+1 Woche?
					<span className="text-secondary text-opacity-75">(Sonntag - Samstag)</span>
				</MyCheckbox>
			)}
		</Fragment>
	);
};

export default function EditorModalVE(
	row: Row<IVorgabenUvorgabenB> | CustomTable<IVorgabenUvorgabenB>,
	titel: string,
): void {
	const ref = createRef<HTMLFormElement>();

	const modal = showModal<IVorgabenUvorgabenB>(
		<MyFormModal
			myRef={ref}
			title={titel}
			submitText={row instanceof Row ? "Speichern" : undefined}
			onSubmit={onSubmit()}
		>
			<MyModalBody>
				{createNameElement(row)}
				{createcheckboxElement(row, "standard")}
				<hr />
				{["beginnB", "endeB"].map(value => createVariableElement(row, value))}
				<hr />
				{createcheckboxElement(row, "nacht")}
				{["beginnN", "endeN"].map(value => createVariableElement(row, value))}
			</MyModalBody>
		</MyFormModal>,
	);

	if (ref.current === null) throw new Error("referenz nicht gesetzt");
	const form = ref.current;

	modal.row = row;

	function onSubmit(): (event: Event) => void {
		return (event: Event): void => {
			if (!(form instanceof HTMLFormElement)) return;
			if (form.checkValidity && !form.checkValidity()) return;
			event.preventDefault();

			const row = modal.row;
			if (!row) throw new Error("Row nicht gefunden");
			const table: CustomTable<IVorgabenUvorgabenB> = row instanceof Row ? row.CustomTable : row;

			const beginnBTag = Number(form.querySelector<HTMLInputElement>("#beginnBTag")?.value ?? NaN);
			const endeBTag = Number(form.querySelector<HTMLInputElement>("#endeBTag")?.value ?? NaN);
			const beginnNTag = Number(form.querySelector<HTMLInputElement>("#beginnNTag")?.value ?? NaN);
			const endeNTag = Number(form.querySelector<HTMLInputElement>("#endeNTag")?.value ?? NaN);
			const endeBNwoche = form.querySelector<HTMLInputElement>("#endeBNwoche")?.checked ?? false;
			const beginnNNwoche = form.querySelector<HTMLInputElement>("#beginnNNwoche")?.checked ?? false;
			const endeNNwoche = form.querySelector<HTMLInputElement>("#endeNNwoche")?.checked ?? false;
			const beginnBZeit = form.querySelector<HTMLInputElement>("#beginnBZeit")?.value ?? "";
			const endeBZeit = form.querySelector<HTMLInputElement>("#endeBZeit")?.value ?? "";
			const beginnNZeit = form.querySelector<HTMLInputElement>("#beginnNZeit")?.value ?? "";
			const endeNZeit = form.querySelector<HTMLInputElement>("#endeNZeit")?.value ?? "";
			const nameN = form.querySelector<HTMLInputElement>("#Name")?.value ?? "";
			const nacht = form.querySelector<HTMLInputElement>("#nacht")?.checked ?? false;
			const standard = form.querySelector<HTMLInputElement>("#standard")?.checked ?? false;

			const values: IVorgabenUvorgabenB = {
				Name: nameN,
				beginnB: { tag: beginnBTag, zeit: beginnBZeit },
				endeB: { tag: endeBTag, zeit: endeBZeit, Nwoche: endeBNwoche },
				nacht: nacht,
				beginnN: { tag: beginnNTag, zeit: beginnNZeit, Nwoche: beginnNNwoche },
				endeN: { tag: endeNTag, zeit: endeNZeit, Nwoche: endeNNwoche },
				standard: standard ? true : undefined,
			};
			if (standard) {
				let ft: CustomTable<IVorgabenUvorgabenB>;
				let newStandard: Row<IVorgabenUvorgabenB> | null;
				if (row instanceof Row) [ft, newStandard] = [row.CustomTable, row];
				else if (row instanceof CustomTable) [ft, newStandard] = [row, null];
				else throw new Error("CustomTable nicht gefunden");
				setStandard(ft, newStandard);
			}
			row instanceof Row ? row.val(values) : row.rows.add(values);

			Modal.getInstance(modal)?.hide();
			saveTableDataVorgabenU(table);
		};
		function setStandard(ft: CustomTable<IVorgabenUvorgabenB>, newStandard: Row<IVorgabenUvorgabenB> | null): void {
			const rows = ft.getRows();

			for (const key in rows) {
				const value = rows[key].cells;
				if (newStandard && newStandard === rows[key]) {
					value.standard = true;
					rows[key].val(value);
				} else if (value.standard) {
					delete value.standard;
					rows[key].val(value);
				}
			}
		}
	}
}
