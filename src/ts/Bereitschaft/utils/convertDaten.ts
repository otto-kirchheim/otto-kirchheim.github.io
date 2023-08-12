import type { IDatenBEJahr, IDatenBZJahr, IMonatsDaten } from "../../interfaces";
import { Storage } from "../../utilities";

export function DataBZ(data?: IMonatsDaten["BZ"], Monat?: number): IMonatsDaten["BZ"] {
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

export function DataBE(data?: IMonatsDaten["BE"], Monat?: number): IMonatsDaten["BE"] {
	if (!(Storage.check("Benutzer") && Storage.check("accessToken"))) return [];

	if (Storage.check("dataBE")) {
		//! Remove nächsten Monat
		const test = Storage.get("dataBE", { check: true });
		if (Array.isArray(test) || typeof test !== "object") Storage.remove("dataBE");
	}

	if (data === undefined) {
		if (!Monat)
			if (Storage.check("Monat")) Monat = Storage.get<number>("Monat", true);
			else return [];
		data = Storage.check("dataBE") ? Storage.get<IDatenBEJahr>("dataBE", true)[Monat] : [];
	}
	return data;
}
