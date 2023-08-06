import Modal from "bootstrap/js/dist/modal";
import { CustomTable, Row } from "../../class/CustomTable";
import {
	createEditorModalFooter,
	createModal,
	createModalBodyFillerElement,
	createModalBodyInputElement,
	createModalBodySelectElement,
} from "../../components";
import type { CustomHTMLDivElement, IDatenBE } from "../../interfaces";
import { Storage, checkMaxTag, saveTableData } from "../../utilities";
import dayjs from "../../utilities/configDayjs";

export default function createEditorModalBereitschaftsEinsatz(
	row: CustomTable | Row,
	titel: string,
): CustomHTMLDivElement {
	const { modal, form } = createModal(
		titel,
		true,
		null,
		createBodyElement,
		createEditorModalFooter(null, row instanceof Row ? "Speichern" : undefined),
		SubmitEventListener,
	);

	return modal;

	function createBodyElement(): HTMLDivElement {
		const modalBody = document.createElement("div");
		modalBody.className = "modal-body row";

		let datum: dayjs.Dayjs;
		if (row instanceof Row) {
			datum = dayjs(row.cells.tagBE, "DD.MM.YYYY");
		} else if (row instanceof CustomTable) {
			const Monat = Storage.get<number>("Monat");
			const Jahr = Storage.get<number>("Jahr");
			datum = dayjs([Jahr, Monat - 1, checkMaxTag(Jahr, Monat - 1)]);
		} else throw new Error("unbekannter Fehler");

		row.columns.array.forEach(column => {
			switch (column.name) {
				case "tagBE":
					modalBody.appendChild(
						createModalBodyInputElement({
							divClass: "form-floating col-12 col-sm-6 pb-3",
							title: column.title,
							name: column.name,
							value: datum.format("YYYY-MM-DD"),
							type: "date",
							required: true,
							min: datum.startOf("M").format("YYYY-MM-DD"),
							max: datum.endOf("M").format("YYYY-MM-DD"),
						}),
					);
					break;

				case "auftragsnummerBE":
					modalBody.appendChild(
						createModalBodyInputElement({
							divClass: "form-floating col-12 pb-3",
							title: "SAP-Nr / Einsatzbeschreibung",
							name: column.name,
							value: row instanceof Row ? row.cells[column.name] : "",
							type: "text",
							required: true,
						}),
					);
					break;

				case "beginBE":
				case "endeBE":
					modalBody.appendChild(
						createModalBodyInputElement({
							divClass: "form-floating col-12 col-sm-6 pb-3",
							title: column.title,
							name: column.name,
							value: row instanceof Row ? row.cells[column.name] : "",
							type: "time",
							required: true,
						}),
					);
					break;

				case "lreBE":
					modalBody.appendChild(
						createModalBodySelectElement({
							divClass: "form-floating col-12 col-sm-6 pb-3",
							title: column.title,
							name: column.name,
							value: row instanceof Row ? row.cells[column.name] : "",
							options: [
								{ text: "Bitte Einsatz auswählen", disabled: true, selected: true },
								{ value: "LRE 1", text: "LRE 1" },
								{ value: "LRE 2", text: "LRE 2" },
								{ value: "LRE 1/2 ohne x", text: "LRE 1/2 ohne x" },
								{ value: "LRE 3", text: "LRE 3" },
								{ value: "LRE 3 ohne x", text: "LRE 3 ohne x" },
							],
							required: true,
						}),
					);
					modalBody.appendChild(createModalBodyFillerElement());
					break;

				case "privatkmBE":
					modalBody.appendChild(
						createModalBodyInputElement({
							divClass: "form-floating col-12 col-sm-6",
							title: column.title,
							name: column.name,
							value: row instanceof Row ? row.cells[column.name] : "",
							type: "number",
							min: 0,
						}),
					);
					break;

				default:
					break;
			}
		});

		return modalBody;
	}

	function SubmitEventListener(): (event: Event) => void {
		return (event: Event) => {
			if (!(form instanceof HTMLFormElement)) return;
			event.preventDefault();
			if (!form.checkValidity()) return;

			const row = modal.row;
			if (!row) throw new Error("Row nicht gefunden");
			const table = row instanceof Row ? row.CustomTable : row;

			const values: IDatenBE = {
				tagBE: dayjs(form.querySelector<HTMLInputElement>("#tagBE")?.value).format("DD.MM.YYYY") ?? "",
				auftragsnummerBE: form.querySelector<HTMLInputElement>("#auftragsnummerBE")?.value ?? "",
				beginBE: form.querySelector<HTMLInputElement>("#beginBE")?.value ?? "",
				endeBE: form.querySelector<HTMLInputElement>("#endeBE")?.value ?? "",
				lreBE: form.querySelector<HTMLSelectElement>("#lreBE")?.value ?? "",
				privatkmBE: Number(form.querySelector<HTMLInputElement>("#privatkmBE")?.value ?? 0),
			};

			row instanceof Row ? row.val(values) : row.rows.add(values);

			Modal.getInstance(modal)?.hide();
			saveTableData(table);
		};
	}
}
