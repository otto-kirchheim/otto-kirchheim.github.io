import { saveTableDataEWT } from ".";
import type { CustomHTMLDivElement, CustomHTMLTableElement, IDatenEWT, IVorgabenU } from "../../interfaces";
import { naechsterTag } from ".";
import { berechnen as ewtBerechnen } from ".";

export default function addEWTtag(
	modal: CustomHTMLDivElement<IDatenEWT>,
	vorgabenU: IVorgabenU,
	Jahr: number,
	Monat: number,
	berechneBuero: boolean = false,
): void {
	// Get the input and select elements
	const tagEInput = modal.querySelector<HTMLInputElement>("#tagE");
	const eOrtESelect = modal.querySelector<HTMLSelectElement>("#EOrt");
	const schichtESelect = modal.querySelector<HTMLSelectElement>("#Schicht");
	const berechnenInput = modal.querySelector<HTMLInputElement>("#berechnen1");

	// Throw an error if any of the required elements is missing
	if (!tagEInput) throw new Error("TagE input not found");
	if (!eOrtESelect) throw new Error("EOrt select not found");
	if (!schichtESelect) throw new Error("Schicht select not found");
	if (!berechnenInput) throw new Error("Berechnen input not found");

	// Get the values of the input and select elements
	const tagE = `0${tagEInput.value}`.slice(-2);
	const eOrtE = eOrtESelect.value;
	const schichtE = schichtESelect.value;
	const berechnen = berechnenInput.checked;

	// Create a new data object with the values
	let data: IDatenEWT = {
		tagE,
		eOrtE,
		schichtE,
		abWE: "",
		ab1E: "",
		anEE: "",
		beginE: "",
		endeE: "",
		abEE: "",
		an1E: "",
		anWE: "",
		berechnen,
	};

	if (berechneBuero) {
		data.berechnen = true;
		data = ewtBerechnen(vorgabenU, [data], Jahr, Monat)[0];
		data = { ...data, ...{ ab1E: "", anEE: "", abEE: "", an1E: "", berechnen: false } };
	} else {
		data = ewtBerechnen(vorgabenU, [data], Jahr, Monat)[0];
	}

	// Get the table and its instance
	const tableE = document.querySelector<CustomHTMLTableElement<IDatenEWT>>("#tableE");
	if (!tableE) throw new Error("TableE not found");
	const ftE = tableE.instance;

	console.log("save ", { ftE });

	// Add the new row to the table and save the data
	ftE.rows.add(data);
	saveTableDataEWT(ftE);

	// Calculate and set the next tag value
	const existingRows: IDatenEWT[] = ftE.getRows().map(row => row.cells);
	naechsterTag(+tagE, existingRows);
}
