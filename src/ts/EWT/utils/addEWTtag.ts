import type { CustomHTMLTableElement, IDaten } from "../../interfaces";
import { saveTableData } from "../../utilities";
import naechsterTag from "./naechsterTag";

export default function addEWTtag(): void {
	// Get the input and select elements
	const tagEInput = document.querySelector<HTMLInputElement>("#tagE");
	const eOrtESelect = document.querySelector<HTMLSelectElement>("#EOrt");
	const schichtESelect = document.querySelector<HTMLSelectElement>("#Schicht");
	const berechnenInput = document.querySelector<HTMLInputElement>("#berechnen1");

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
	const data: IDaten["EWT"][0] = {
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

	// Get the table and its instance
	const tableE = document.querySelector<CustomHTMLTableElement>("#tableE");
	if (!tableE) throw new Error("TableE not found");
	const ftE = tableE.instance;

	console.log("save ", { ftE });

	// Add the new row to the table and save the data
	ftE.rows.add(data);
	saveTableData(ftE);

	// Calculate and set the next tag value
	const existingRows = ftE.getRows().map(row => row.cells);
	naechsterTag(+tagE, existingRows);
}
