import { aktualisiereBerechnung } from "../../Berechnung";
import { CustomTable } from "../../class/CustomTable";
import type { IDatenBZ, IDatenBZJahr } from "../../interfaces";
import Storage from "../../utilities/Storage";
import tableToArray from "../../utilities/tableToArray";

export default function saveTableDataBZ(ft: CustomTable<IDatenBZ>, Monat?: number): IDatenBZJahr {
	Monat ??= Storage.get<number>("Monat", { check: true });

	const data = Storage.get<IDatenBZJahr>("dataBZ", { check: true });
	data[Monat] = tableToArray<IDatenBZ>(ft);
	Storage.set("dataBZ", data);
	aktualisiereBerechnung();
	return data;
}
