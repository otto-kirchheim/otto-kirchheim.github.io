type TModalBodyShowElementOption = {
	divClass?: string | null;
	labelClass?: string | null;
	spanClass?: string | null;
	title: string;
	name: string;
	text: string | number;
};

export default function createModalBodyShowElement(options: TModalBodyShowElementOption): HTMLDivElement {
	const divElement = document.createElement("div");
	divElement.className = options.divClass ?? "mb-1 row";

	const label = document.createElement("label");
	label.className = options.labelClass ?? "col-3 col-form-label text-wrap fw-bold";
	label.setAttribute("for", options.name);
	label.textContent = options.title;
	divElement.appendChild(label);

	const span = document.createElement("span");
	span.className = options.spanClass ?? "col-9 align-middle text-break my-auto";
	span.id = options.name;
	span.innerHTML = options.text.toString() ?? "&nbsp;";
	divElement.appendChild(span);

	return divElement;
}
