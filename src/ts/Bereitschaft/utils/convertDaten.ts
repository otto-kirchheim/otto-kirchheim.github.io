import type { IDatenBEJahr, IDatenBZJahr, IMonatsDaten } from "../../interfaces";
import { Storage } from "../../utilities";

export function DataBZ(data?: IMonatsDaten["BZ"], Monat?: number): IMonatsDaten["BZ"] {
	if (data === undefined) {
		if (!Monat) Monat = Storage.get<number>("Monat");
		data = Storage.check("dataBZ") ? Storage.get<IDatenBZJahr>("dataBZ")?.[Monat] ?? [] : [];
	}
	return data;
}

export function DataBE(data?: IMonatsDaten["BE"], Monat?: number): IMonatsDaten["BE"] {
	if (data === undefined) {
		if (!Monat) Monat = Storage.get<number>("Monat");
		data = Storage.check("dataBE") ? Storage.get<IDatenBEJahr>("dataBE")?.[Monat] ?? [] : [];
	}
	return data;
}
