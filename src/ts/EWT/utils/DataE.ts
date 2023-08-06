import type { IDaten, IMonatsDaten } from "../../interfaces";
import { Storage } from "../../utilities";

export default function DataE(data?: IMonatsDaten["EWT"], Monat?: number): IMonatsDaten["EWT"] {
	if (!(Storage.check("Benutzer") && Storage.check("accessToken"))) return [];
	if (Storage.check("dataE")) {
		//! Remove nächsten Monat
		const test = Storage.get("dataE");
		if (Array.isArray(test) || typeof test !== "object") Storage.remove("dataE");
	}

	if (data === undefined) {
		if (!Monat)
			if (Storage.check("Monat")) Monat = Storage.get<number>("Monat");
			else return [];
		data = Storage.check("dataE") ? Storage.get<IDaten["EWT"]>("dataE")?.[Monat] ?? [] : [];
	}
	return data;
}
