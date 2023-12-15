import type { IDatenEWTJahr, IMonatsDaten } from "../../interfaces";
import { Storage } from "../../utilities";

export default function DataE(data?: IMonatsDaten["EWT"], Monat?: number): IMonatsDaten["EWT"] {
	if (!(Storage.check("Benutzer") && Storage.check("accessToken"))) return [];

	if (data === undefined) {
		if (!Monat)
			if (Storage.check("Monat")) Monat = Storage.get<number>("Monat", true);
			else return [];
		data = Storage.check("dataE") ? Storage.get<IDatenEWTJahr>("dataE", true)[Monat] : [];
	}
	return data;
}
