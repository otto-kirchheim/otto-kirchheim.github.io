import { aktualisiereBerechnung } from "../../Berechnung";
import { CustomTable } from "../../class/CustomTable";
import type { IDatenEWT, IDatenEWTJahr } from "../../interfaces";
import Storage from "../../utilities/Storage";
import tableToArray from "../../utilities/tableToArray";

export default function saveTableDataEWT(ft: CustomTable<IDatenEWT>, Monat?: number): IDatenEWTJahr {
	if (!Monat) Monat = Storage.get<number>("Monat", { check: true });
	const data = Storage.get<IDatenEWTJahr>("dataE", { check: true });
	data[Monat] = tableToArray<IDatenEWT>(ft);
	Storage.set("dataE", data);
	aktualisiereBerechnung();
	return data;
}
