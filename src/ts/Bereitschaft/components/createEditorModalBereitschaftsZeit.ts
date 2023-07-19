import { Modal } from "bootstrap";
import { CustomTable, Row } from "../../class/CustomTable";
import { createEditorModalFooter, createModal, createModalBodyInputElement } from "../../components";
import type { CustomHTMLDivElement, IDatenBZ } from "../../interfaces";
import { Storage, checkMaxTag, saveTableData, toJSON } from "../../utilities";
import dayjs from "../../utilities/configDayjs";

export default function createEditorModalBereitschaftsZeit(
	row: CustomTable | Row,
	title: string,
): CustomHTMLDivElement {
	const { modal, form } = createModal(
		title,
		true,
		"sm",
		createBodyElement,
		createEditorModalFooter(null, row instanceof Row ? "Speichern" : undefined),
		SubmitEventListener,
	);

	return modal;

	function createBodyElement(): HTMLDivElement {
		const modalBody = document.createElement("div");
		modalBody.className = "modal-body row";

		if (row instanceof Row) {
			row.columns.array.forEach(column => {
				let datum, min, max;
				switch (column.name) {
					case "editing":
						break;
					case "beginB":
					case "endeB":
						datum = dayjs(row.cells[column.name]);
						min = datum.startOf("M").format("YYYY-MM-DDTHH:mm");
						max = datum.add(1, "M").startOf("M").format("YYYY-MM-DDTHH:mm");
						modalBody.appendChild(
							createModalBodyInputElement({
								divClass: "form-floating col-12 pb-3",
								title: column.title,
								name: column.name,
								value: dayjs(row.cells[column.name]).format("YYYY-MM-DDTHH:mm"),
								type: "datetime-local",
								required: true,
								min,
								max,
							}),
						);
						break;
					default:
						modalBody.appendChild(
							createModalBodyInputElement({
								divClass: "form-floating col-12",
								title: column.title,
								name: column.name,
								value: column.parser(row.cells[column.name]),
								type: "number",
								min: 0,
								max: 60,
							}),
						);
						break;
				}
			});
		} else if (row instanceof CustomTable) {
			const Monat = Storage.get<number>("Monat");
			const Jahr = Storage.get<number>("Jahr");
			row.columns.array.forEach(column => {
				let datum, min, max;
				switch (column.name) {
					case "editing":
						break;
					case "beginB":
					case "endeB":
						datum = dayjs([Jahr, Monat - 1, checkMaxTag(Jahr, Monat - 1)]);
						min = datum.startOf("M").format("YYYY-MM-DDTHH:mm");
						max = datum.add(1, "M").startOf("M").format("YYYY-MM-DDTHH:mm");
						modalBody.appendChild(
							createModalBodyInputElement({
								divClass: "form-floating col-12 pb-3",
								title: column.title,
								name: column.name,
								value: null,
								type: "datetime-local",
								required: true,
								min,
								max,
							}),
						);
						break;
					default:
						modalBody.appendChild(
							createModalBodyInputElement({
								divClass: "form-floating col-12",
								title: column.title,
								name: column.name,
								value: "",
								type: "number",
								min: 0,
								max: 60,
							}),
						);
						break;
				}
			});
		}

		return modalBody;
	}

	function SubmitEventListener(): (event: Event) => void {
		return (event: Event) => {
			if (form instanceof HTMLDivElement) return;
			if (form.checkValidity && !form.checkValidity()) return;
			event.preventDefault();

			const row = modal.row;
			if (!row) throw new Error("Row nicht gefunden");
			const table = row instanceof Row ? row.CustomTable : row;

			const formData = toJSON<IDatenBZ>(new FormData(form), table);
			const values: IDatenBZ = {
				beginB: dayjs(formData.beginB).toISOString(),
				endeB: dayjs(formData.endeB).toISOString(),
				pauseB: Number(formData.pauseB),
			};

			row instanceof Row ? row.val(values) : row.rows.add(values);

			Modal.getInstance(modal)?.hide();
			saveTableData(table);
		};
	}
}
