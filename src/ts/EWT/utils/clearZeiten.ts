import type { CustomHTMLDivElement, IDatenEWT } from "../../interfaces";

export default function clearZeiten(modal: CustomHTMLDivElement<IDatenEWT>): void {
	const inputIds = ["abWE", "ab1E", "anEE", "beginE", "endeE", "abEE", "an1E", "anWE"];
	inputIds.forEach(id => {
		const input = modal.querySelector<HTMLInputElement>(`#${id}`);
		if (input) input.value = "";
	});
}
