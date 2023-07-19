import { Modal } from "bootstrap";
import { Column, CustomTable, Row } from "../../class/CustomTable";
import {
	createEditorModalFooter,
	createModal,
	createModalBodyInputElement,
	createModalBodySelectElement,
	createModalBodyTitelElement,
} from "../../components";
import type { CustomHTMLDivElement } from "../../interfaces";
import { Storage, checkMaxTag, saveTableData } from "../../utilities";
import dayjs from "../../utilities/configDayjs";

export default function createEditorModalNeben(row: Row | CustomTable, titel: string): CustomHTMLDivElement {
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

		const Monat: number = Storage.get<number>("Monat") - 1;
		const Jahr: number = Storage.get<number>("Jahr");

		let Tag: number;
		if (row instanceof Row) Tag = row.cells.tagN;
		else if (row instanceof CustomTable) Tag = checkMaxTag(Jahr, Monat);
		else throw new Error("unbekannter Fehler");

		const datum = dayjs([Jahr, Monat, Tag]);

		let column;

		column = row.columns.array.find(column => column.name === "tagN") as Column;
		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating col-6 pb-3",
				title: column.title,
				name: column.name,
				value: datum.format("YYYY-MM-DD"),
				type: "date",
				required: true,
				min: datum.startOf("M").format("YYYY-MM-DD"),
				max: datum.endOf("M").format("YYYY-MM-DD"),
			}),
		);

		modalBody.appendChild(createModalBodyTitelElement("Arbeitszeit"));

		["beginN", "endeN"].forEach(value => {
			column = row.columns.array.find(column => column.name === value) as Column;
			modalBody.appendChild(
				createModalBodyInputElement({
					divClass: "form-floating col-6 pb-3",
					title: column.title,
					name: column.name,
					value: row instanceof Row ? row.cells[column.name] : null,
					type: "time",
					required: true,
				}),
			);
		});

		modalBody.appendChild(createModalBodyTitelElement("Pause"));

		["beginPauseN", "endePauseN"].forEach(value => {
			column = row.columns.array.find(column => column.name === value) as Column;
			modalBody.appendChild(
				createModalBodyInputElement({
					divClass: "form-floating col-6 pb-3",
					title: column.title,
					name: column.name,
					value: row instanceof Row ? row.cells[column.name] : null,
					type: "time",
				}),
			);
		});

		modalBody.appendChild(createModalBodyTitelElement("Zulage"));

		column = row.columns.array.find(column => column.name === "dauerN") as Column;
		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating col-6 pb-3",
				title: column.title,
				name: column.name,
				value: row instanceof Row ? row.cells[column.name] : 1,
				type: "number",
				required: true,
				min: 1,
				max: 1,
			}),
		);

		column = row.columns.array.find(column => column.name === "nrN") as Column;
		modalBody.appendChild(
			createModalBodySelectElement({
				divClass: "form-floating col-6 pb-3",
				title: column.title,
				name: column.name,
				value: row instanceof Row ? row.cells[column.name] : null,
				required: true,
				options: [{ value: "040 Fahrentsch.", text: "040 Fahrentsch.", selected: true }],
			}),
		);

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
			saveTableData(table);
		};
	}
}
