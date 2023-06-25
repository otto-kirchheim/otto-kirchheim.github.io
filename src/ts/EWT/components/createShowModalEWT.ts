import { Column, Row } from "../../class/CustomTable";
import {
	createModal,
	createModalBodyCheckbox,
	createModalBodyShowElement,
	createModalBodySpanElement,
	createShowModalFooter,
} from "../../components";
import type { CustomHTMLDivElement } from "../../interfaces";
import { saveTableData } from "../../utilities";

export default function createShowModalEWT(row: Row, title: string): CustomHTMLDivElement {
	const { modal } = createModal(title, false, "sm", createModalBody, createShowModalFooter);
	return modal;

	function createModalBody(): HTMLDivElement {
		const modalBody = document.createElement("div");
		modalBody.className = "modal-body row";
		let column;

		column = row.columns.array.find(column => column.name === "tagE") as Column;
		modalBody.appendChild(
			createModalBodyShowElement({
				divClass: "mb-1 col-6",
				labelClass: "col-5 col-form-label text-wrap fw-bold",
				spanClass: "col-2 align-middle text-break my-auto",
				title: `${column.title}:`,
				name: column.name,
				text: column.parser(row.cells[column.name]),
			})
		);

		column = row.columns.array.find(column => column.name === "berechnen") as Column;
		const berechnenCheckbox = createModalBodyCheckbox({
			checkClass: "form-check form-switch col-5",
			id: column.name,
			text: column.title,
			status: row.cells?.[column.name] ?? true,
		});
		berechnenCheckbox.addEventListener("click", (e: MouseEvent) => {
			const row = (<CustomHTMLDivElement>(<HTMLInputElement>e.target).closest(".modal")).row as Row;
			row.cells.berechnen = (<HTMLInputElement>e.target).checked;
			const table = row.CustomTable;
			table.drawRows();
			saveTableData(table);
		});
		modalBody.appendChild(berechnenCheckbox);

		column = row.columns.array.find(column => column.name === "eOrtE") as Column;
		modalBody.appendChild(
			createModalBodyShowElement({
				labelClass: "col-4 col-sm-5 col-form-label text-wrap fw-bold",
				spanClass: "col-8 col-sm-7 align-middle text-break my-auto",
				title: `${column.title}:`,
				name: column.name,
				text: column.parser(row.cells[column.name]),
			})
		);

		column = row.columns.array.find(column => column.name === "schichtE") as Column;
		modalBody.appendChild(
			createModalBodyShowElement({
				labelClass: "col-4 col-sm-5 col-form-label text-wrap fw-bold",
				spanClass: "col-8 col-sm-7 align-middle text-break my-auto",
				title: `${column.title}:`,
				name: column.name,
				text: column.parser(row.cells[column.name]),
			})
		);

		modalBody.appendChild(document.createElement("hr"));

		const titleWrapper = document.createElement("div");
		titleWrapper.className = "icon-ewt-arrow";
		modalBody.appendChild(titleWrapper);

		titleWrapper.appendChild(createModalBodySpanElement("material-icons-round big-icons", "arrow_downward"));
		titleWrapper.appendChild(createModalBodySpanElement("material-icons-round big-icons", "arrow_upward"));

		modalBody.appendChild(
			createModalTitleElement({
				vorTitle: "ab",
				title: "Wohnung",
				nachTitle: "an",
			})
		);

		column = row.columns.array.find(column => column.name === "abWE") as Column;
		modalBody.appendChild(
			createModalBodyShowElement2({
				name: column.name,
				text: column.parser(row.cells[column.name]).toString(),
			})
		);
		column = row.columns.array.find(column => column.name === "anWE") as Column;
		modalBody.appendChild(
			createModalBodyShowElement2({
				name: column.name,
				text: column.parser(row.cells[column.name]).toString(),
			})
		);

		modalBody.appendChild(
			createModalTitleElement({
				vorTitle: "von",
				title: "Arbeitszeit",
				nachTitle: "bis",
			})
		);

		column = row.columns.array.find(column => column.name === "beginE") as Column;
		modalBody.appendChild(
			createModalBodyShowElement2({
				name: column.name,
				text: column.parser(row.cells[column.name]).toString(),
			})
		);
		column = row.columns.array.find(column => column.name === "endeE") as Column;
		modalBody.appendChild(
			createModalBodyShowElement2({
				name: column.name,
				text: column.parser(row.cells[column.name]).toString(),
			})
		);

		modalBody.appendChild(
			createModalTitleElement({
				vorTitle: "ab",
				title: "1. Tätigkeitsstätte",
				nachTitle: "an",
			})
		);

		column = row.columns.array.find(column => column.name === "ab1E") as Column;
		modalBody.appendChild(
			createModalBodyShowElement2({
				name: column.name,
				text: column.parser(row.cells[column.name]).toString(),
			})
		);
		column = row.columns.array.find(column => column.name === "an1E") as Column;
		modalBody.appendChild(
			createModalBodyShowElement2({
				name: column.name,
				text: column.parser(row.cells[column.name]).toString(),
			})
		);

		modalBody.appendChild(
			createModalTitleElement({
				vorTitle: "an",
				title: "Einsatzort",
				nachTitle: "ab",
			})
		);

		column = row.columns.array.find(column => column.name === "anEE") as Column;
		modalBody.appendChild(
			createModalBodyShowElement2({
				name: column.name,
				text: column.parser(row.cells[column.name]).toString(),
			})
		);
		column = row.columns.array.find(column => column.name === "abEE") as Column;
		modalBody.appendChild(
			createModalBodyShowElement2({
				name: column.name,
				text: column.parser(row.cells[column.name]).toString(),
			})
		);

		return modalBody;

		function createModalTitleElement(options: { vorTitle: string; title: string; nachTitle: string; divClass?: string }) {
			const titleWrapper = document.createElement("div");
			titleWrapper.className = options.divClass ?? "icon-ewt";

			const title = document.createElement("h5");
			title.className = "my-1";
			title.textContent = options.title;

			titleWrapper.appendChild(createModalBodySpanElement("", options.vorTitle));
			titleWrapper.appendChild(title);
			titleWrapper.appendChild(createModalBodySpanElement("", options.nachTitle));

			return titleWrapper;
		}

		function createModalBodyShowElement2(options: { name: string; text: string; divClass?: string; spanClass?: string }) {
			const divElement = document.createElement("div");
			divElement.className = options.divClass ?? "mb-1 col-6 text-center";

			const span = document.createElement("span");
			span.className = options.spanClass ?? "";
			span.id = options.name;
			span.innerHTML = options.text; //|| "--:--";
			divElement.appendChild(span);

			return divElement;
		}
	}
}
