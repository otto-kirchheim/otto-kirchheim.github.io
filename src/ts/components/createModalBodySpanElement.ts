export default function createModalBodySpanElement(spanClass: string, text: string): HTMLSpanElement {
	const span = document.createElement("span");
	span.className = spanClass;
	span.textContent = text;
	return span;
}
