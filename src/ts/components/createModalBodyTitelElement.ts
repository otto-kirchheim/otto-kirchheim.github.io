export default function createModalBodyTitelElement(text: string): HTMLHeadingElement {
	const title = document.createElement("h4");
	title.className = "text-center mb-1";
	title.innerHTML = text;
	return title;
}
