import Modal from "bootstrap/js/dist/modal";
import { createRef } from "preact";
import { CustomTable, Row } from "../../class/CustomTable";
import { MyButton, MyCheckbox, MyFormModal, MyInput, MyModalBody, MySelect, showModal } from "../../components";
import type { CustomHTMLDivElement, IDatenEWT, IVorgabenU } from "../../interfaces";
import { Storage, checkMaxTag } from "../../utilities";
import dayjs from "../../utilities/configDayjs";
import { clearZeiten, saveTableDataEWT } from "../utils";

const createTimeElement = (row: CustomTable<IDatenEWT> | Row<IDatenEWT>, columnName: string) => {
	const column = row.columns.array.find(column => column.name === columnName);
	if (!column) throw Error(`Spalte ${columnName} nicht gefunden`);
	return (
		<MyInput
			divClass="form-floating col-6 pb-3"
			type="time"
			id={column.name}
			name={column.title}
			value={row instanceof Row ? row.cells[column.name].toString() : ""}
		>
			{column.title}
		</MyInput>
	);
};

export default function EditorModalEWT(row: CustomTable<IDatenEWT> | Row<IDatenEWT>, titel: string): void {
	const ref = createRef<HTMLFormElement>();

	const vorgabenU: IVorgabenU = Storage.get("VorgabenU", { check: true });

	const Monat: number = Storage.get<number>("Monat", { check: true }) - 1;
	const Jahr: number = Storage.get<number>("Jahr", { check: true });

	let Tag: number;
	if (row instanceof Row) Tag = Number(row.cells.tagE);
	else if (row instanceof CustomTable) Tag = checkMaxTag(Jahr, Monat);
	else throw new Error("unbekannter Fehler");

	const datum = dayjs([Jahr, Monat, Tag]);

	const customButtons =
		row instanceof Row ? (
			<MyButton
				key="Zeitenloeschen"
				className="btn btn-danger"
				text="Zeiten löschen"
				clickHandler={() => clearZeiten(modal)}
			/>
		) : undefined;

	const modal: CustomHTMLDivElement<IDatenEWT> = showModal(
		<MyFormModal
			myRef={ref}
			size="fullscreen-sm-down"
			title={titel}
			submitText={row instanceof Row ? "Speichern" : undefined}
			customButtons={[customButtons]}
			onSubmit={onSubmit()}
		>
			<MyModalBody>
				<MyInput
					divClass="form-floating col-12 col-sm-5 pb-3"
					required
					type="date"
					id="tagE"
					name={row.columns.array.find(column => column.name === "tagE")?.title ?? "Tag"}
					min={datum.startOf("M").format("YYYY-MM-DD")}
					max={datum.endOf("M").format("YYYY-MM-DD")}
					value={datum.format("YYYY-MM-DD")}
				>
					{row.columns.array.find(column => column.name === "tagE")?.title ?? "Tag"}
				</MyInput>
				<MySelect
					className="form-floating col-12 col-sm-7 pb-3"
					id="eOrtE"
					title={row.columns.array.find(column => column.name === "eOrtE")?.title ?? "Einsatzort"}
					value={row instanceof Row ? row.cells["eOrtE"].toString() : undefined}
					options={[
						{ text: "", selected: true },
						...vorgabenU.fZ.map(ort => {
							return {
								value: ort.key,
								text: ort.key,
							};
						}),
					]}
				/>
				<MySelect
					className="form-floating col-12 col-sm-7 pb-3"
					required
					id={"schichtE"}
					title={row.columns.array.find(column => column.name === "schichtE")?.title ?? "Schicht"}
					value={row instanceof Row ? row.cells["schichtE"].toString() : undefined}
					options={[
						{
							value: "T",
							text: `Tag | ${vorgabenU.aZ.bT.toString()}-${vorgabenU.aZ.eT.toString()}/${vorgabenU.aZ.eTF.toString()}`,
							selected: true,
						},
						{ value: "N", text: `Nacht | ${vorgabenU.aZ.bN.toString()}-${vorgabenU.aZ.eN.toString()}` },
						{ value: "BN", text: `Nacht (Ber) | ${vorgabenU.aZ.bBN.toString()}-${vorgabenU.aZ.eN.toString()}` },
						{ value: "S", text: `Sonder | ${vorgabenU.aZ.bS.toString()}-${vorgabenU.aZ.eS.toString()}` },
					]}
				/>
				<MyCheckbox
					className="form-check form-switch col-12 col-sm-4 pb-3"
					id={"berechnen"}
					checked={row instanceof Row ? row.cells["berechnen"] : true}
				>
					{row.columns.array.find(column => column.name === "berechnen")?.title ?? "Berechnen?"}
				</MyCheckbox>

				<hr />
				<div className="icon-ewt">
					<span className="material-icons-round big-icons">arrow_downward</span>
					<h4 className="text-center mb-1">Wohnung</h4>
					<span className="material-icons-round big-icons">arrow_upward</span>
				</div>
				{createTimeElement(row, "abWE")}
				{createTimeElement(row, "anWE")}

				<h4 className="text-center mb-1">Arbeitszeit</h4>
				{createTimeElement(row, "beginE")}
				{createTimeElement(row, "endeE")}

				<h4 className="text-center mb-1">1. Tätigkeitsstätte</h4>
				{createTimeElement(row, "ab1E")}
				{createTimeElement(row, "an1E")}

				<h4 className="text-center mb-1">Einsatzort</h4>
				{createTimeElement(row, "anEE")}
				{createTimeElement(row, "abEE")}
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
			const table: CustomTable<IDatenEWT> = row instanceof Row ? row.CustomTable : row;

			const values: IDatenEWT = {
				tagE: dayjs(form.querySelector<HTMLInputElement>("#tagE")?.value).format("DD") ?? "",
				eOrtE: form.querySelector<HTMLInputElement>("#eOrtE")?.value ?? "",
				schichtE: form.querySelector<HTMLInputElement>("#schichtE")?.value ?? "",
				abWE: form.querySelector<HTMLInputElement>("#abWE")?.value ?? "",
				ab1E: form.querySelector<HTMLInputElement>("#ab1E")?.value ?? "",
				anEE: form.querySelector<HTMLInputElement>("#anEE")?.value ?? "",
				beginE: form.querySelector<HTMLInputElement>("#beginE")?.value ?? "",
				endeE: form.querySelector<HTMLInputElement>("#endeE")?.value ?? "",
				abEE: form.querySelector<HTMLInputElement>("#abEE")?.value ?? "",
				an1E: form.querySelector<HTMLInputElement>("#an1E")?.value ?? "",
				anWE: form.querySelector<HTMLInputElement>("#anWE")?.value ?? "",
				berechnen: form.querySelector<HTMLInputElement>("#berechnen")?.checked ?? true,
			};

			row instanceof Row ? row.val(values) : row.rows.add(values);

			Modal.getInstance(modal)?.hide();
			saveTableDataEWT(table);
		};
	}
}
