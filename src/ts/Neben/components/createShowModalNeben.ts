import { Column, Row } from "../../class/CustomTable";
import {
	createModal,
	createModalBodyShowElement,
	createModalBodySpanElement,
	createShowModalFooter,
} from "../../components";
import type { CustomHTMLDivElement } from "../../interfaces";

export default function createShowModalNeben(row: Row, title: string): CustomHTMLDivElement {
	const { modal } = createModal(title, false, "sm", createModalBody, createShowModalFooter);
	return modal;

	function createModalBody() {
		const modalBody = document.createElement("div");
		modalBody.className = "modal-body row";
		let column1, column2;

		column1 = row.columns.array.find(column => column.name === "tagN") as Column;
		modalBody.appendChild(
			createModalBodyShowElement({
				divClass: "mb-2 col-12 text-center",
				labelClass: "pe-3 align-middle col-form-label text-wrap fw-bold",
				spanClass: "align-middle my-auto",
				title: `${column1.title}:`,
				name: column1.name,
				text: column1.parser(row.cells[column1.name]),
			})
		);

		modalBody.appendChild(createModalBodyTitelElement("Arbeitszeit"));

		column1 = row.columns.array.find(column => column.name === "beginN") as Column;
		column2 = row.columns.array.find(column => column.name === "endeN") as Column;
		modalBody.appendChild(
			createModalBodyShowElementNeben({
				divClass: "mb-2 col-12 text-center",
				vorTitle: column1.parser(row.cells[column1.name]) as string,
				title: "arrow_right_alt",
				nachTitle: column2.parser(row.cells[column2.name]) as string,
			})
		);

		modalBody.appendChild(createModalBodyTitelElement("Pause"));

		column1 = row.columns.array.find(column => column.name === "beginPauseN") as Column;
		column2 = row.columns.array.find(column => column.name === "endePauseN") as Column;
		modalBody.appendChild(
			createModalBodyShowElementNeben({
				divClass: "mb-2 text-center",
				vorTitle: column1.parser(row.cells[column1.name]) as string,
				title: "arrow_right_alt",
				nachTitle: column2.parser(row.cells[column2.name]) as string,
			})
		);

		modalBody.appendChild(createModalBodyTitelElement("Zulage"));

		column1 = row.columns.array.find(column => column.name === "dauerN") as Column;
		column2 = row.columns.array.find(column => column.name === "nrN") as Column;
		modalBody.appendChild(
			createModalBodyShowElementNeben({
				divClass: "mb-2 col-12 text-center",
				vorTitleClass: "col-4 align-middle text-break my-auto",
				vorTitle: column1.parser(row.cells[column1.name]) as string,
				titleClass: "align-middle fw-semibold mx-1",
				title: "X",
				nachTitleClass: "col-6 align-middle text-break my-auto",
				nachTitle: column2.parser(row.cells[column2.name]) as string,
			})
		);

		return modalBody;

		function createModalBodyTitelElement(text: string): HTMLHeadingElement {
			const title = document.createElement("h4");
			title.className = "text-center mb-0";
			title.innerHTML = text;
			return title;
		}

		function createModalBodyShowElementNeben(options: {
			divClass?: string;
			vorTitle: string;
			title: string;
			nachTitle: string;
			vorTitleClass?: string;
			titleClass?: string;
			nachTitleClass?: string;
		}): HTMLDivElement {
			const showWrapper = document.createElement("div");
			showWrapper.className = options.divClass ?? "icon-ewt";

			showWrapper.appendChild(createModalBodySpanElement(options.vorTitleClass ?? "", options.vorTitle));
			showWrapper.appendChild(
				createModalBodySpanElement(options.titleClass ?? "material-icons-round big-icons", options.title)
			);
			showWrapper.appendChild(createModalBodySpanElement(options.nachTitleClass ?? "", options.nachTitle));

			return showWrapper;
		}
	}
}
