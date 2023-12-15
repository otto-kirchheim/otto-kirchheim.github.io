import type { IDatenBZJahr, IMonatsDaten } from "../../interfaces";
import { Storage } from "../../utilities";

export default function DataBZ(data?: IMonatsDaten["BZ"], Monat?: number): IMonatsDaten["BZ"] {
	if (!(Storage.check("Benutzer") && Storage.check("accessToken"))) return [];

	if (data === undefined) {
		if (!Monat)
			if (Storage.check("Monat")) Monat = Storage.get<number>("Monat", true);
			else return [];
		data = Storage.check("dataBZ") ? Storage.get<IDatenBZJahr>("dataBZ", true)[Monat] : [];
	}
	return data;
}
