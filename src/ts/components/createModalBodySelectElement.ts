type TModalBodySelectElementOption = {
	name: string;
	title: string;
	value: string | number | Date | null;
	divClass: string;
	required?: boolean;
	eventListener?: (this: HTMLElement, ev: Event) => void;
	options: {
		value: string | number;
		text: string;
		disabled?: boolean;
		selected?: boolean;
		html?: boolean;
	}[];
};

export default function createModalBodySelectElement(options: TModalBodySelectElementOption): HTMLDivElement {
	const div = document.createElement("div");
	div.className = options.divClass;
	if (options.required) div.classList.add("required");

	const select = document.createElement("select");
	select.className = "form-select validate";
	select.id = options.name;
	if (options.required) select.required = true;
	options.options.forEach(optionObject => {
		const option = document.createElement("option");
		option.value = String(optionObject.value);
		if (optionObject.html) {
			option.innerHTML = optionObject.text;
		} else {
			option.textContent = optionObject.text;
		}
		if (optionObject.disabled) option.disabled = true;
		if (optionObject.selected && !options.value) option.selected = true;
		if (+option.value === options.value) option.selected = true;

		select.appendChild(option);
	});
	if (options.value) select.value = String(options.value);
	if (options.eventListener) select.addEventListener("change", options.eventListener);
	div.appendChild(select);

	const label = document.createElement("label");
	label.className = "form-label";
	label.htmlFor = options.name;
	label.textContent = options.title;
	div.appendChild(label);
	return div;
}
