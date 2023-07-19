import type { IDaten, IMonatsDaten } from "../../interfaces";
import { Storage } from "../../utilities";

export function DataE(data?: IMonatsDaten["EWT"], Monat?: number): IMonatsDaten["EWT"] {
	if (Storage.check("dataE") && Array.isArray(Storage.get("dataE"))) Storage.remove("dataE");
	if (data === undefined) {
		if (!Monat) Monat = Storage.get<number>("Monat");
		data = Storage.check("dataE") ? Storage.get<IDaten["EWT"]>("dataE")?.[Monat] ?? [] : [];
	}
	return data;
}
