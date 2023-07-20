import type { IDatenNJahr, IMonatsDaten } from "../../interfaces";
import { Storage } from "../../utilities";

export default function DataN(data?: IMonatsDaten["N"], Monat?: number): IMonatsDaten["N"] {
	if (!(Storage.check("Benutzer") && Storage.check("accessToken"))) return [];
	if (Storage.check("dataN")) {
		//! Remove nächsten Monat
		const test = Storage.get("dataN");
		if (Array.isArray(test) || typeof test !== "object") Storage.remove("dataN");
	}
	if (data === undefined) {
		if (!Monat)
			if (Storage.check("Monat")) Monat = Storage.get<number>("Monat");
			else return [];
		data = Storage.check("dataN") ? Storage.get<IDatenNJahr>("dataN")?.[Monat] ?? [] : [];
	}
	return data;
}
