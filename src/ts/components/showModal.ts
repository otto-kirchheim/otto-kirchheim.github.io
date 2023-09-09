import Modal from "bootstrap/js/dist/modal";
import { ComponentChild, render } from "preact";
import type { CustomHTMLDivElement } from "../interfaces";
import { CustomTableTypes } from "../class/CustomTable";

function resetModalProperties<T extends CustomTableTypes>(modal: CustomHTMLDivElement<T>): void {
	modal.row = null;
	modal.role = "document";
	modal.innerHTML = "";
}

export default function showModal<T extends CustomTableTypes>(children: ComponentChild): CustomHTMLDivElement<T> {
	const modal = document.querySelector<CustomHTMLDivElement<T>>("#modal");
	if (!modal) throw new Error("Element nicht gefunden");

	resetModalProperties(modal);

	render(null, modal);
	render(children, modal);

	Modal.getOrCreateInstance(modal).show();
	return modal;
}
