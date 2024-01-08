import { aktualisiereBerechnung } from "../../Berechnung";
import { CustomTable } from "../../class/CustomTable";
import type { IDatenN, IDatenNJahr } from "../../interfaces";
import Storage from "../../utilities/Storage";
import tableToArray from "../../utilities/tableToArray";

export default function saveTableDataN<T extends IDatenNJahr>(ft: CustomTable<IDatenN>, Monat?: number): T | undefined {
	if (!Monat) Monat = Storage.get<number>("Monat", { check: true });
	const Jahr = Storage.get<number>("Jahr", { check: true, default: 2024 });
	if (Jahr < 2024) return Storage.get<IDatenNJahr>("dataN", { check: true }) as T;

	const data = Storage.get<IDatenNJahr>("dataN", { check: true });
	data[Monat] = tableToArray<IDatenN>(ft);
	Storage.set("dataN", data);
	aktualisiereBerechnung();
	return data as T;
}
