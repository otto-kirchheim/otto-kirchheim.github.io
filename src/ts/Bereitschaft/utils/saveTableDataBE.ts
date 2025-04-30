import { aktualisiereBerechnung } from "../../Berechnung";
import { CustomTable } from "../../class/CustomTable";
import type { IDatenBE, IDatenBEJahr } from "../../interfaces";
import Storage from "../../utilities/Storage";
import tableToArray from "../../utilities/tableToArray";

export default function saveTableDataBE(ft: CustomTable<IDatenBE>, Monat?: number): IDatenBEJahr {
	Monat ??= Storage.get<number>("Monat", { check: true });

	const data = Storage.get<IDatenBEJahr>("dataBE", { check: true });
	data[Monat] = tableToArray<IDatenBE>(ft);
	Storage.set("dataBE", data);
	aktualisiereBerechnung();
	return data;
}
