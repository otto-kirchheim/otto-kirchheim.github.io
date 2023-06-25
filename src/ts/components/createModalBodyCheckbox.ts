type TModalBodyCheckbosOption = {
	checkClass: string;
	id: string;
	text: string;
	status?: boolean;
	disabled?: boolean;
	eventListener?: (this: HTMLElement, ev: Event) => void;
};

export default function createModalBodyCheckbox(options: TModalBodyCheckbosOption): HTMLDivElement {
	const div = document.createElement("div");
	div.className = options.checkClass;

	const input = document.createElement("input");
	input.type = "checkbox";
	input.className = "form-check-input";
	input.id = options.id;
	if (options.status) input.checked = true;
	if (options.disabled) input.disabled = true;
	if (options.eventListener != undefined) input.addEventListener("change", options.eventListener);
	div.appendChild(input);

	const label = document.createElement("label");
	label.className = "form-check-label";
	label.htmlFor = options.id;
	label.innerHTML = options.text;
	div.appendChild(label);
	return div;
}
