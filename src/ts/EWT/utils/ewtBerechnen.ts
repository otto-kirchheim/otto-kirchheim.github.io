import { DataE, berechnen } from ".";
import { createSnackBar } from "../../class/CustomSnackbar";
import type { CustomHTMLTableElement, IDaten, IVorgabenU } from "../../interfaces";
import { saveTableData } from "../../utilities";

export default function ewtBerechnen({
	monat,
	jahr,
	daten,
	vorgabenU,
}: {
	monat: number;
	jahr: number;
	daten: IDaten["EWT"];
	vorgabenU: IVorgabenU;
}) {
	const berechneteDaten = berechnen(vorgabenU, structuredClone(daten), jahr, monat);

	const table = document.querySelector<CustomHTMLTableElement>("#tableE");
	if (!table) throw new Error("Tabelle nicht gefunden");
	const ftE = table.instance;
	console.log("save ", { ftE });
	ftE.rows.load(DataE(berechneteDaten));

	saveTableData(ftE);
	createSnackBar({
		message: `EWT<br/>Zeiten berechnet.`,
		status: "success",
		timeout: 3000,
		position: "br",
		fixed: true,
	});
}
