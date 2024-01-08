import { saveTableDataN } from ".";
import type { CustomHTMLTableElement, IDatenN } from "../../interfaces";

export default function addNebenTag(form: HTMLDivElement | HTMLFormElement): void {
	const select = form.querySelector<HTMLSelectElement>("#tagN");
	if (!select) throw new Error("Select element with ID 'tagN' not found");
	let idN = select.selectedIndex;
	if (idN < 0) return;
	const daten = JSON.parse(select.value) as IDatenN;

	const inputAnzahl040N = form.querySelector<HTMLInputElement>("#anzahl040N");
	if (!inputAnzahl040N) throw new Error("Input element with ID 'anzahl040N' not found");
	daten.anzahl040N = +inputAnzahl040N.value;

	const inputAuftragN = form.querySelector<HTMLInputElement>("#AuftragN");
	if (!inputAuftragN) throw new Error("Input element with ID 'AuftragN' not found");
	daten.auftragN = inputAuftragN.value;

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

	inputAuftragN.value = "";

	const tableN = document.querySelector<CustomHTMLTableElement<IDatenN>>("#tableN");
	if (!tableN) throw new Error("table N nicht gefunden");
	const ftN = tableN.instance;
	ftN.rows.add(daten);
	saveTableDataN(ftN);
}
