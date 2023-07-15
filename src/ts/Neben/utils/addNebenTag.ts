import type { CustomHTMLTableElement, IDatenN } from "../../interfaces";
import { saveTableData } from "../../utilities";

export default function addNebenTag(form: HTMLDivElement | HTMLFormElement): void {
	const select = form.querySelector<HTMLSelectElement>("#tagN");
	if (!select) {
		throw new Error("Select element with ID 'tagN' not found");
	}
	let idN = select.selectedIndex;
	if (idN < 0) return;
	const daten = JSON.parse(select.value) as IDatenN;
	const inputNebenbezug = form.querySelector<HTMLSelectElement>("#Nebenbezug");
	if (!inputNebenbezug) {
		throw new Error("Select element with ID 'Nebenbezug' not found");
	}
	daten.nrN = inputNebenbezug.value;
	const inputAnzahlN = form.querySelector<HTMLInputElement>("#AnzahlN");
	if (!inputAnzahlN) {
		throw new Error("Input element with ID 'AnzahlN' not found");
	}
	daten.dauerN = +inputAnzahlN.value;

	console.log(daten);
	select.options[idN].selected = false;
	select.options[idN].disabled = true;
	idN++;
	while (idN < select.length) {
		if (!select.options[idN].disabled) {
			select.options[idN].selected = true;
			break;
		}
		idN++;
	}

	const tableN = document.querySelector<CustomHTMLTableElement>("#tableN");
	if (!tableN) throw new Error("table N nicht gefunden");
	const ftN = tableN.instance;
	ftN.rows.add(daten);
	saveTableData(ftN);
}
