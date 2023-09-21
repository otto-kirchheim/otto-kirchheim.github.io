import { aktualisiereBerechnung } from "../../Berechnung";
import { CustomTable } from "../../class/CustomTable";
import type { IDatenN, IDatenNJahr } from "../../interfaces";
import Storage from "../../utilities/Storage";
import tableToArray from "../../utilities/tableToArray";

export default function saveTableDataN<T extends IDatenNJahr>(ft: CustomTable<IDatenN>, Monat?: number): T {
	if (!Monat) Monat = Storage.get<number>("Monat", { check: true });

	const data = Storage.get<IDatenNJahr>("dataN", { check: true });
	data[Monat] = tableToArray<IDatenN>(ft);
	Storage.set("dataN", data);
	aktualisiereBerechnung();
	return data as T;
}
