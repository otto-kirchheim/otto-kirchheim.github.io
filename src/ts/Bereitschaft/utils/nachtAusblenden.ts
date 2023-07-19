export default function nachtAusblenden(parentElement: HTMLDivElement): void {
	const nachtCheckbox = parentElement.querySelector<HTMLInputElement>("#nacht");
	const nachtschichtDiv = parentElement.querySelector<HTMLDivElement>("#nachtschicht");
	if (nachtCheckbox && nachtschichtDiv) nachtschichtDiv.style.display = nachtCheckbox.checked ? "flex" : "none";
}
