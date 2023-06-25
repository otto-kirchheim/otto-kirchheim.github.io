type TModalBodyInputElementOption = {
	type: string;
	name: string;
	title: string;
	value: string | number | Date | null;
	divClass: string;
	required?: boolean;
	disabled?: boolean;
	min?: string | number | Date;
	max?: string | number | Date;
	eventListener?: (this: HTMLElement, ev: Event) => void;
};

export default function createModalBodyInputElement(options: TModalBodyInputElementOption): HTMLDivElement {
	const div = document.createElement("div");
	div.className = options.divClass;
	if (options.required) div.classList.add("required");

	const input = document.createElement("input");
	input.type = options.type;
	input.className = "form-control validate";
	input.id = options.name;
	input.name = options.title;
	input.value = String(options.value);
	if (options.required) input.required = true;
	if (options.disabled) input.disabled = true;
	if (options.min != undefined) input.min = String(options.min);
	if (options.max != undefined) input.max = String(options.max);
	if (options.eventListener) input.addEventListener("change", options.eventListener);

	div.appendChild(input);

	const label = document.createElement("label");
	label.htmlFor = options.name;
	label.textContent = options.title;
	div.appendChild(label);

	return div;
}
