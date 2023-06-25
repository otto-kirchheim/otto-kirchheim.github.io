export default function createEditorModalFooter(
	customButtons?: Array<HTMLButtonElement> | null,
	submitText = "Hinzufügen"
): () => HTMLDivElement {
	return () => {
		const modalFooter = document.createElement("div");
		modalFooter.className = "modal-footer";

		const btnSubmit = document.createElement("button");
		btnSubmit.type = "submit";
		btnSubmit.className = "btn btn-primary";
		btnSubmit.ariaLabel = submitText;
		btnSubmit.innerHTML = submitText;
		modalFooter.appendChild(btnSubmit);

		if (customButtons) customButtons.forEach(button => modalFooter.appendChild(button));

		const btnClose = document.createElement("button");
		btnClose.type = "button";
		btnClose.className = "btn btn-secondary";
		btnClose.ariaLabel = "Abbrechen";
		btnClose.dataset.bsDismiss = "modal";
		btnClose.textContent = "Abbrechen";
		modalFooter.appendChild(btnClose);

		return modalFooter;
	};
}
