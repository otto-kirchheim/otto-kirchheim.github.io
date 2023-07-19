import { aktualisiereBerechnung } from "../Berechnung";
import { CustomTable } from "../class/CustomTable";
import {
	IDatenBE,
	IDatenBEJahr,
	IDatenBZ,
	IDatenBZJahr,
	IDatenEWT,
	IDatenEWTJahr,
	IDatenN,
	IDatenNJahr,
	IVorgabenU,
	IVorgabenUvorgabenB,
} from "../interfaces";
import Storage from "./Storage";
import tableToArray from "./tableToArray";

export default function saveTableData<T>(ft: CustomTable, Monat?: number): T {
	if (!Monat) Monat = Storage.get<number>("Monat");
	let data,
		aenderung = false;
	switch (ft.table) {
		case "tableBZ":
			data = Storage.get<IDatenBZJahr>("dataBZ");
			data[Monat] = tableToArray<IDatenBZ>(ft);
			Storage.set("dataBZ", data);
			aenderung = true;
			break;
		case "tableBE":
			data = Storage.get<IDatenBEJahr>("dataBE");
			data[Monat] = tableToArray<IDatenBE>(ft);
			Storage.set("dataBE", data);
			aenderung = true;
			break;
		case "tableE":
			data = Storage.get<IDatenEWTJahr>("dataE");
			data[Monat] = tableToArray<IDatenEWT>(ft);
			Storage.set("dataE", data);
			aenderung = true;
			break;
		case "tableN":
			data = Storage.get<IDatenNJahr>("dataN");
			data[Monat] = tableToArray<IDatenN>(ft);
			Storage.set("dataN", data);
			aenderung = true;
			break;
		case "tableVE":
			data = Storage.get<IVorgabenU>("VorgabenU");
			data.vorgabenB = Object.fromEntries(tableToArray<IVorgabenUvorgabenB>(ft).entries());
			Storage.set("VorgabenU", data);
			break;
		default:
			throw new Error("Tabelle unbekannt");
	}
	if (aenderung) aktualisiereBerechnung();
	return data as T;
}
