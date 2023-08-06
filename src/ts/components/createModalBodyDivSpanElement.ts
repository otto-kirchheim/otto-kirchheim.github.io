type TcreateModalBodyDivSpanElement = {
	divClass?: string;
	spanClass?: string;
	spanID?: string;
	spanText?: string;
};

export default function createModalBodyDivSpanElement({
	divClass,
	spanClass,
	spanID,
	spanText,
}: TcreateModalBodyDivSpanElement): HTMLSpanElement {
	const div = document.createElement("div");
	if (divClass) div.className = divClass;

	const span = document.createElement("span");
	if (spanClass) span.className = spanClass;
	if (spanID) span.id = spanID;
	if (spanText) span.textContent = spanText;

	div.appendChild(span);
	return div;
}
