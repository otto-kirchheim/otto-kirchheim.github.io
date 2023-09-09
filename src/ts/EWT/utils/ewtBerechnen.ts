import { DataE, berechnen } from ".";
import { createSnackBar } from "../../class/CustomSnackbar";
import type { CustomHTMLTableElement, IDatenEWT, IMonatsDaten, IVorgabenU } from "../../interfaces";
import { saveTableDataEWT } from "../../utilities";

type ewtBerechnenType = {
	monat: number;
	jahr: number;
	daten: IMonatsDaten["EWT"];
	vorgabenU: IVorgabenU;
};

export default function ewtBerechnen({ monat, jahr, daten, vorgabenU }: ewtBerechnenType): void {
	if (!monat || !jahr || !daten || !vorgabenU) throw new Error("Daten fehlen");
	const berechneteDaten = berechnen(vorgabenU, structuredClone(daten), jahr, monat);

	const table = document.querySelector<CustomHTMLTableElement<IDatenEWT>>("#tableE");
	if (!table) throw new Error("Tabelle nicht gefunden");
	const ftE = table.instance;
	console.log("save ", { ftE });
	ftE.rows.load(DataE(berechneteDaten, monat));
	saveTableDataEWT(ftE, monat);

	createSnackBar({
		message: `EWT<br/>Zeiten berechnet.`,
		status: "success",
		timeout: 3000,
		fixed: true,
	});
}
