import Modal from "bootstrap/js/dist/modal";
import { Dayjs } from "dayjs";
import { ComponentChildren, Fragment, createRef } from "preact";
import { CustomTable, Row } from "../../class/CustomTable";
import { MyFormModal, MyInput, MyModalBody, MySelect, showModal } from "../../components";
import type { CustomHTMLDivElement, IDatenBE } from "../../interfaces";
import { Storage, checkMaxTag } from "../../utilities";
import dayjs from "../../utilities/configDayjs";
import { saveTableDataBE } from "../utils";

const createElements = (row: CustomTable<IDatenBE> | Row<IDatenBE>, datum: Dayjs): ComponentChildren => {
	return row.columns.array.map(column => {
		switch (column.name) {
			case "tagBE":
				return (
					<MyInput
						divClass="form-floating col-12 col-sm-6 pb-3"
						type="date"
						id={column.name}
						name={column.title}
						required
						min={datum.startOf("M").format("YYYY-MM-DD")}
						max={datum.endOf("M").format("YYYY-MM-DD")}
						value={datum.format("YYYY-MM-DD")}
					>
						{column.title}
					</MyInput>
				);
			case "auftragsnummerBE":
				return (
					<MyInput
						divClass="form-floating col-12 pb-3"
						type="text"
						id={column.name}
						name="SAP-Nr / Einsatzbeschreibung"
						required
						min={datum.startOf("M").format("YYYY-MM-DD")}
						max={datum.endOf("M").format("YYYY-MM-DD")}
						value={row instanceof Row ? row.cells[column.name] : ""}
					>
						SAP-Nr / Einsatzbeschreibung
					</MyInput>
				);
			case "beginBE":
			case "endeBE":
				return (
					<MyInput
						divClass="form-floating col-12 col-sm-6 pb-3"
						type="time"
						id={column.name}
						name={column.title}
						required
						value={row instanceof Row ? row.cells[column.name] : ""}
					>
						{column.title}
					</MyInput>
				);
			case "lreBE":
				return (
					<Fragment>
						<MySelect
							className="form-floating col-12 col-sm-6 pb-3"
							id={column.name}
							title={column.title}
							required
							value={row instanceof Row ? row.cells[column.name] : ""}
							options={[
								{ text: "Bitte Einsatz auswählen", disabled: true, selected: true },
								{ value: "LRE 1", text: "LRE 1" },
								{ value: "LRE 2", text: "LRE 2" },
								{ value: "LRE 1/2 ohne x", text: "LRE 1/2 ohne x" },
								{ value: "LRE 3", text: "LRE 3" },
								{ value: "LRE 3 ohne x", text: "LRE 3 ohne x" },
							]}
						/>
						<div className="w-100" />
					</Fragment>
				);
			case "privatkmBE":
				return (
					<MyInput
						divClass="form-floating col-12 col-sm-6"
						type="number"
						id={column.name}
						name={column.title}
						min={"0"}
						value={row instanceof Row ? row.cells[column.name] : ""}
					>
						{column.title}
					</MyInput>
				);
			default:
				return;
		}
	});
};

export default function EditorModalBE(row: CustomTable<IDatenBE> | Row<IDatenBE>, titel: string): void {
	const ref = createRef<HTMLFormElement>();

	let datum: dayjs.Dayjs;
	if (row instanceof Row) {
		datum = dayjs(row.cells.tagBE, "DD.MM.YYYY");
	} else if (row instanceof CustomTable) {
		const Monat: number = Storage.get<number>("Monat", { check: true });
		const Jahr: number = Storage.get<number>("Jahr", { check: true });
		datum = dayjs([Jahr, Monat - 1, checkMaxTag(Jahr, Monat - 1)]);
	} else throw new Error("unbekannter Fehler");

	const modal: CustomHTMLDivElement<IDatenBE> = showModal(
		<MyFormModal
			myRef={ref}
			title={titel}
			submitText={row instanceof Row ? "Speichern" : undefined}
			onSubmit={onSubmit()}
		>
			<MyModalBody>{createElements(row, datum)}</MyModalBody>
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
			const table: CustomTable<IDatenBE> = row instanceof Row ? row.CustomTable : row;

			const values: IDatenBE = {
				tagBE: dayjs(form.querySelector<HTMLInputElement>("#tagBE")?.value).format("DD.MM.YYYY") ?? "",
				auftragsnummerBE: form.querySelector<HTMLInputElement>("#auftragsnummerBE")?.value ?? "",
				beginBE: form.querySelector<HTMLInputElement>("#beginBE")?.value ?? "",
				endeBE: form.querySelector<HTMLInputElement>("#endeBE")?.value ?? "",
				lreBE: (form.querySelector<HTMLSelectElement>("#lreBE")?.value as IDatenBE["lreBE"]) ?? "",
				privatkmBE: Number(form.querySelector<HTMLInputElement>("#privatkmBE")?.value ?? 0),
			};

			row instanceof Row ? row.val(values) : row.rows.add(values);

			Modal.getInstance(modal)?.hide();
			saveTableDataBE(table);
		};
	}
}
