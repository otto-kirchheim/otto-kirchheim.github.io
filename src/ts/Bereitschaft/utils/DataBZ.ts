import type { IDatenBZJahr, IMonatsDaten } from "../../interfaces";
import { Storage } from "../../utilities";

export default function DataBZ(data?: IMonatsDaten["BZ"], Monat?: number): IMonatsDaten["BZ"] {
	if (!(Storage.check("Benutzer") && Storage.check("accessToken"))) return [];

	if (Storage.check("dataBZ")) {
		//! Remove nächsten Monat
		const test = Storage.get("dataBZ", { check: true });
		if (Array.isArray(test) || typeof test !== "object") Storage.remove("dataBZ");
	}

	if (data === undefined) {
		if (!Monat)
			if (Storage.check("Monat")) Monat = Storage.get<number>("Monat", true);
			else return [];
		data = Storage.check("dataBZ") ? Storage.get<IDatenBZJahr>("dataBZ", true)[Monat] : [];
	}
	return data;
}
