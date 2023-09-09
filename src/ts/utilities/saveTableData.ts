import { aktualisiereBerechnung } from "../Berechnung";
import { CustomTable } from "../class/CustomTable";
import type {
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

export function saveTableDataBZ(ft: CustomTable<IDatenBZ>, Monat?: number): IDatenBZJahr {
	if (!Monat) Monat = Storage.get<number>("Monat", { check: true });

	const data = Storage.get<IDatenBZJahr>("dataBZ", { check: true });
	data[Monat] = tableToArray<IDatenBZ>(ft);
	Storage.set("dataBZ", data);
	aktualisiereBerechnung();
	return data;
}

export function saveTableDataBE(ft: CustomTable<IDatenBE>, Monat?: number): IDatenBEJahr {
	if (!Monat) Monat = Storage.get<number>("Monat", { check: true });

	const data = Storage.get<IDatenBEJahr>("dataBE", { check: true });
	data[Monat] = tableToArray<IDatenBE>(ft);
	Storage.set("dataBE", data);
	aktualisiereBerechnung();
	return data;
}

export function saveTableDataEWT(ft: CustomTable<IDatenEWT>, Monat?: number): IDatenEWTJahr {
	if (!Monat) Monat = Storage.get<number>("Monat", { check: true });
	const data = Storage.get<IDatenEWTJahr>("dataE", { check: true });
	data[Monat] = tableToArray<IDatenEWT>(ft);
	Storage.set("dataE", data);
	aktualisiereBerechnung();
	return data;
}

export function saveTableDataN<T extends IDatenNJahr>(ft: CustomTable<IDatenN>, Monat?: number): T {
	if (!Monat) Monat = Storage.get<number>("Monat", { check: true });

	const data = Storage.get<IDatenNJahr>("dataN", { check: true });
	data[Monat] = tableToArray<IDatenN>(ft);
	Storage.set("dataN", data);
	aktualisiereBerechnung();
	return data as T;
}

export function saveTableDataVorgabenU(ft: CustomTable<IVorgabenUvorgabenB>): IVorgabenU {
	const data = Storage.get<IVorgabenU>("VorgabenU", { check: true });
	data.vorgabenB = Object.fromEntries(tableToArray<IVorgabenUvorgabenB>(ft).entries());
	Storage.set("VorgabenU", data);

	return data;
}
