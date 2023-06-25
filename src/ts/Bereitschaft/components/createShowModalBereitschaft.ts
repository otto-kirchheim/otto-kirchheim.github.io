import { Row } from "../../class/CustomTable";
import { createModal, createModalBodyShowElement, createShowModalFooter } from "../../components";
import type { CustomHTMLDivElement } from "../../interfaces";

export default function createShowModalBereitschaft(row: Row, title: string): CustomHTMLDivElement {
	const { modal } = createModal(title, false, "sm", createModalBody, createShowModalFooter);
	return modal;

	function createModalBody() {
		const modalBody = document.createElement("div");
		modalBody.className = "modal-body";

		row.columns.array.forEach(column => {
			if (column.editing) return;
			modalBody.appendChild(
				createModalBodyShowElement({
					divClass: "",
					labelClass: "col-5 col-form-label text-wrap fw-bold",
					spanClass: "col-7 align-middle text-break my-auto",
					title: `${column.title}:`,
					name: column.name,
					text: column.parser(row.cells[column.name]),
				})
			);
		});

		return modalBody;
	}
}
