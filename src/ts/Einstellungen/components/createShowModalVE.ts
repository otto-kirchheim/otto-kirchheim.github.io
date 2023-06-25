import { createModal, createModalBodyShowElement, createShowModalFooter } from "../../components";
import { Column, Row } from "../../class/CustomTable";
import type { CustomHTMLDivElement } from "../../interfaces";

export default function createShowModalVE(row: Row, title: string): CustomHTMLDivElement {
	const { modal } = createModal(title, false, null, createModalBody, createShowModalFooter);
	return modal;

	function createModalBody(): HTMLDivElement {
		const modalBody = document.createElement("div");
		modalBody.className = "modal-body row";
		let column: Column;

		column = row.columns.array.find((column: Column) => column.name === "Name") as Column;
		modalBody.appendChild(
			createModalBodyShowElement({
				divClass: "mb-1",
				labelClass: "col-3 col-form-label text-wrap fw-bold",
				spanClass: "col-9 align-middle text-break my-auto",
				title: `${column.title}:`,
				name: column.name,
				text: column.parser(row.cells[column.name]),
			})
		);

		column = row.columns.array.find((column: Column) => column.name === "standard") as Column;
		modalBody.appendChild(
			createModalBodyShowElement({
				divClass: "mb-1",
				labelClass: "col-3 col-form-label text-wrap fw-bold",
				spanClass: "col-9 align-middle text-break my-auto",
				title: `${column.title}:`,
				name: column.name,
				text: column.parser(row.cells[column.name]),
			})
		);

		["beginnB", "endeB", "nacht", "beginnN", "endeN"].forEach(value => {
			column = row.columns.array.find((column: Column) => column.name === value) as Column;
			modalBody.appendChild(
				createModalBodyShowElement({
					labelClass: "col-3 col-form-label text-wrap fw-bold",
					spanClass: "col-9 align-middle text-break my-auto",
					title: `${column.title}:`,
					name: column.name,
					text: column.parser(row.cells[column.name], false),
				})
			);
		});

		return modalBody;
	}
}
