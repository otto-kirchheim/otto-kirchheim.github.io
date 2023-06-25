import type { CustomHTMLDivElement } from "../interfaces";

export default function createModal(
	title: string,
	withForm: boolean,
	size:
		| null
		| "sm"
		| "lg"
		| "xl"
		| "fullscreen"
		| "fullscreen-sm-down"
		| "fullscreen-md-down"
		| "fullscreen-lg-down"
		| "fullscreen-xl-down"
		| "fullscreen-xxl-down",
	createModalBody: () => HTMLDivElement,
	createModalFooter: () => HTMLDivElement,
	SubmitEventListener: () => (event: Event) => void = () => (event: Event) => {
		throw new Error(`SubmitEvent fehlt${event.type}`);
	}
): { modal: CustomHTMLDivElement; form: HTMLFormElement | HTMLDivElement } {
	const modal = document.querySelector<CustomHTMLDivElement>("#modal");
	if (!modal || modal === null) throw new Error("Element nicht gefunden");
	modal.innerHTML = "";
	modal.row = null;
	modal.role = "document";

	const modalDialog = document.createElement("div");
	modalDialog.className = "modal-dialog";
	if (size !== null) modalDialog.classList.add(`modal-${size}`);

	const ModalContentWrapper = withForm ? document.createElement("form") : document.createElement("div");
	if (withForm && typeof SubmitEventListener === "function")
		ModalContentWrapper.addEventListener("submit", SubmitEventListener());
	ModalContentWrapper.className = "modal-content";

	ModalContentWrapper.appendChild(createModalHeader(title));
	ModalContentWrapper.appendChild(createModalBody());
	ModalContentWrapper.appendChild(createModalFooter());

	modalDialog.appendChild(ModalContentWrapper);

	modal.appendChild(modalDialog);
	return { modal, form: ModalContentWrapper };
}

function createModalHeader(title: string): HTMLDivElement {
	const modalHeader = document.createElement("div");
	modalHeader.className = "modal-header";

	const modalTitle = document.createElement("h5");
	modalTitle.className = "modal-title";
	modalTitle.textContent = title;
	modalHeader.appendChild(modalTitle);

	const btnClose = document.createElement("button");
	btnClose.type = "button";
	btnClose.className = "btn-close";
	btnClose.dataset.bsDismiss = "modal";
	btnClose.ariaLabel = "Schließen";
	modalHeader.appendChild(btnClose);

	return modalHeader;
}
