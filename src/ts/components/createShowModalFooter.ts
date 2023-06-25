import { Row } from "../class/CustomTable";
import type { CustomHTMLDivElement } from "../interfaces";

export default function createShowModalFooter(): HTMLDivElement {
	const modalFooter = document.createElement("div");
	modalFooter.className = "modal-footer";

	const btnEdit = document.createElement("button");
	btnEdit.type = "button";
	btnEdit.className = "btn btn-primary";
	btnEdit.ariaLabel = "editieren";
	btnEdit.dataset.bsDismiss = "modal";
	btnEdit.innerHTML = "Bearbeiten";
	btnEdit.addEventListener("click", event => {
		const row = <Row>(<Required<CustomHTMLDivElement>>(<HTMLButtonElement>event.target).closest(".modal")).row;
		row.CustomTable.options.editing.editRow(row);
	});
	modalFooter.appendChild(btnEdit);

	const btnDelete = document.createElement("button");
	btnDelete.type = "button";
	btnDelete.className = "btn btn-danger";
	btnDelete.ariaLabel = "löschen";
	btnDelete.dataset.bsDismiss = "modal";
	btnDelete.innerHTML = "Löschen";
	btnDelete.addEventListener("click", event => {
		const row = <Row>(<Required<CustomHTMLDivElement>>(<HTMLButtonElement>event.target).closest(".modal")).row;
		row.CustomTable.options.editing.deleteRow(row);
	});
	modalFooter.appendChild(btnDelete);

	const btnClose = document.createElement("button");
	btnClose.type = "button";
	btnClose.className = "btn btn-secondary";
	btnClose.ariaLabel = "Schließen";
	btnClose.dataset.bsDismiss = "modal";
	btnClose.textContent = "Schließen";
	modalFooter.appendChild(btnClose);

	return modalFooter;
}
