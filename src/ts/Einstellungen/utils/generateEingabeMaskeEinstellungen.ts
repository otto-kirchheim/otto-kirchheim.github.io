import { generateEingabeTabelleEinstellungenVorgabenB } from ".";
import { BereitschaftsEinsatzZeiträume } from "../../Bereitschaft";
import { CustomTable } from "../../class/CustomTable";
import type { CustomHTMLTableElement, IVorgabenU, IVorgabenUPers, IVorgabenUaZ } from "../../interfaces";
import { Storage, saveTableData } from "../../utilities";

export default function generateEingabeMaskeEinstellungen(VorgabenU: IVorgabenU = Storage.get("VorgabenU")): void {
	const VorgabenB = VorgabenU.vorgabenB ?? BereitschaftsEinsatzZeiträume;

	setElementValues<IVorgabenUPers>(VorgabenU.pers);
	setElementValues<IVorgabenUaZ>(VorgabenU.aZ);

	populateTable(VorgabenU);

	const table = document.querySelector<CustomHTMLTableElement>(`#tableVE`);
	if (!table) throw new Error("Tabelle nicht gefunden");
	const ftVE = table.instance;

	if (ftVE instanceof CustomTable) {
		ftVE.rows.load([...Object.values(VorgabenB)]);
		saveTableData(ftVE);
		console.log("saved", ftVE);
	} else {
		generateEingabeTabelleEinstellungenVorgabenB(VorgabenB);
	}
}

function populateTable(VorgabenU: IVorgabenU): void {
	const tbody = document.querySelector<HTMLTableElement>("#TbodyTätigkeitsstätten");
	if (tbody === null) throw new Error();
	tbody.innerHTML = "";

	for (const { key, text, value } of VorgabenU.fZ) {
		const tr = tbody.insertRow();
		createInput(tr, 0, "Text", key);
		createInput(tr, 1, "Text", text);
		createInput(tr, 2, "time", value);
	}

	for (let i = 0; i < 3; i++) {
		const tr = tbody.insertRow();
		createInput(tr, 0, "Text", "");
		createInput(tr, 1, "Text", "");
		createInput(tr, 2, "time", "");
	}

	function createInput(tr: HTMLTableRowElement, position: number, type: "Text" | "time", value: string): void {
		const td = tr.insertCell(position);
		const input = document.createElement("input");
		input.type = type;
		input.className = "form-control text-center";
		input.value = value;
		td.appendChild(input);
	}
}

function setElementValues<T>(values: T): void {
	for (const key in values) {
		const element = document.querySelector<HTMLInputElement | HTMLSelectElement>(`#${key}`);
		const value = values[key as keyof T];
		if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) {
			if (isNumberOrString(value)) {
				element.value = value.toString();
			} else {
				throw new Error("unbekannter Wert");
			}
		}
	}
}

function isNumberOrString(value: unknown): value is number | string {
	return typeof value === "number" || typeof value === "string";
}
