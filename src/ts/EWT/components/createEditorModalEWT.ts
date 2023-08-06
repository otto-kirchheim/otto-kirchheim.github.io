import Modal from "bootstrap/js/dist/modal";
import { Column, CustomTable, Row } from "../../class/CustomTable";
import {
	createEditorModalFooter,
	createModal,
	createModalBodyCheckbox,
	createModalBodyInputElement,
	createModalBodySelectElement,
	createModalBodySpanElement,
	createModalBodyTitelElement,
} from "../../components";
import type { CustomHTMLDivElement, IDatenEWT, IVorgabenU } from "../../interfaces";
import { Storage, checkMaxTag, saveTableData } from "../../utilities";
import dayjs from "../../utilities/configDayjs";
import { clearZeiten } from "../utils";

export default function createEditorModalEWT(row: CustomTable | Row, titel: string): CustomHTMLDivElement {
	const { modal, form } = createModal(
		titel,
		true,
		"fullscreen-sm-down",
		createBodyElement,
		createEditorModalFooter(customFooterButtton(), row instanceof Row ? "Speichern" : undefined),
		SubmitEventListener,
	);

	return modal;

	function createBodyElement(): HTMLDivElement {
		const vorgabenU: IVorgabenU = Storage.get("VorgabenU");

		const modalBody = document.createElement("div");
		modalBody.className = "modal-body row";

		const Monat: number = Storage.get<number>("Monat") - 1;
		const Jahr: number = Storage.get<number>("Jahr");

		let Tag: number;
		if (row instanceof Row) Tag = Number(row.cells.tagE);
		else if (row instanceof CustomTable) Tag = checkMaxTag(Jahr, Monat);
		else throw new Error("unbekannter Fehler");

		const datum = dayjs([Jahr, Monat, Tag]);

		let column;

		column = row.columns.array.find(column => column.name === "tagE") as Column;
		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating col-12 col-sm-5 pb-3",
				title: column.title,
				name: column.name,
				value: datum.format("YYYY-MM-DD"),
				type: "date",
				required: true,
				min: datum.startOf("M").format("YYYY-MM-DD"),
				max: datum.endOf("M").format("YYYY-MM-DD"),
			}),
		);

		column = row.columns.array.find(column => column.name === "eOrtE") as Column;
		modalBody.appendChild(
			createModalBodySelectElement({
				divClass: "form-floating col-12 col-sm-7 pb-3",
				title: column.title,
				name: column.name,
				value: row instanceof Row ? row.cells[column.name] : null,
				required: false,
				options: [
					{ text: "", selected: true },
					...vorgabenU.fZ.map(ort => {
						return {
							value: ort.key,
							text: ort.key,
						};
					}),
				],
			}),
		);

		column = row.columns.array.find(column => column.name === "schichtE") as Column;
		modalBody.appendChild(
			createModalBodySelectElement({
				divClass: "form-floating col-12 col-sm-7 pb-3",
				title: column.title,
				name: column.name,
				value: row instanceof Row ? row.cells[column.name] : null,
				required: true,
				options: [
					{ value: "T", text: "Tag", selected: true },
					{ value: "N", text: "Nacht" },
					{ value: "BN", text: "Nacht/Bereitschaft" },
					{ value: "S", text: "Sonder" },
				],
			}),
		);
		column = row.columns.array.find(column => column.name === "berechnen") as Column;
		modalBody.appendChild(
			createModalBodyCheckbox({
				checkClass: "form-check form-switch col-12 col-sm-4 pb-3",
				id: column.name,
				text: column.title,
				status: row instanceof Row ? row.cells[column.name] : true,
			}),
		);

		modalBody.appendChild(document.createElement("hr"));

		const titleWrapper = document.createElement("div");
		titleWrapper.className = "icon-ewt";
		modalBody.appendChild(titleWrapper);

		titleWrapper.appendChild(createModalBodySpanElement("material-icons-round big-icons", "arrow_downward"));
		titleWrapper.appendChild(createModalBodyTitelElement("Wohnung"));
		titleWrapper.appendChild(createModalBodySpanElement("material-icons-round big-icons", "arrow_upward"));

		column = row.columns.array.find(column => column.name === "abWE") as Column;
		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating col-6 pb-3",
				title: column.title,
				name: column.name,
				value: row instanceof Row ? row.cells[column.name] : "",
				type: "time",
			}),
		);

		column = row.columns.array.find(column => column.name === "anWE") as Column;
		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating col-6 pb-3",
				title: column.title,
				name: column.name,
				value: row instanceof Row ? row.cells[column.name] : "",
				type: "time",
			}),
		);

		modalBody.appendChild(createModalBodyTitelElement("Arbeitszeit"));

		column = row.columns.array.find(column => column.name === "beginE") as Column;
		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating col-6 pb-3",
				title: column.title,
				name: column.name,
				value: row instanceof Row ? row.cells[column.name] : "",
				type: "time",
			}),
		);

		column = row.columns.array.find(column => column.name === "endeE") as Column;
		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating col-6 pb-3",
				title: column.title,
				name: column.name,
				value: row instanceof Row ? row.cells[column.name] : "",
				type: "time",
			}),
		);

		modalBody.appendChild(createModalBodyTitelElement("1. Tätigkeitsstätte"));

		column = row.columns.array.find(column => column.name === "ab1E") as Column;
		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating col-6 pb-3",
				title: column.title,
				name: column.name,
				value: row instanceof Row ? row.cells[column.name] : "",
				type: "time",
			}),
		);

		column = row.columns.array.find(column => column.name === "an1E") as Column;
		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating col-6 pb-3",
				title: column.title,
				name: column.name,
				value: row instanceof Row ? row.cells[column.name] : "",
				type: "time",
			}),
		);

		modalBody.appendChild(createModalBodyTitelElement("Einsatzort"));

		column = row.columns.array.find(column => column.name === "anEE") as Column;
		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating col-6",
				title: column.title,
				name: column.name,
				value: row instanceof Row ? row.cells[column.name] : "",
				type: "time",
			}),
		);

		column = row.columns.array.find(column => column.name === "abEE") as Column;
		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating col-6",
				title: column.title,
				name: column.name,
				value: row instanceof Row ? row.cells[column.name] : "",
				type: "time",
			}),
		);

		return modalBody;
	}

	function customFooterButtton(): HTMLButtonElement[] {
		if (row instanceof Row) {
			const btnClearZeiten = document.createElement("button");
			btnClearZeiten.type = "button";
			btnClearZeiten.className = "btn btn-danger";
			btnClearZeiten.ariaLabel = "Zeiten löschen";
			btnClearZeiten.innerHTML = "Zeiten löschen";
			btnClearZeiten.addEventListener("click", () => clearZeiten(modal));
			return [btnClearZeiten];
		}
		return [];
	}

	function SubmitEventListener(): (event: Event) => void {
		return (event: Event) => {
			if (!(form instanceof HTMLFormElement)) return;
			event.preventDefault();
			if (!form.checkValidity()) return;

			const row = modal.row;
			if (!row) throw new Error("Row nicht gefunden");
			const table = row instanceof Row ? row.CustomTable : row;

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
			saveTableData(table);
		};
	}
}
