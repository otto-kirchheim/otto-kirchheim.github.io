import type { IDatenBEJahr, IMonatsDaten } from "../../interfaces";
import { Storage } from "../../utilities";

export default function DataBE(data?: IMonatsDaten["BE"], Monat?: number): IMonatsDaten["BE"] {
	if (!(Storage.check("Benutzer") && Storage.check("accessToken"))) return [];

	if (data === undefined) {
		if (!Monat)
			if (Storage.check("Monat")) Monat = Storage.get<number>("Monat", true);
			else return [];
		data = Storage.check("dataBE") ? Storage.get<IDatenBEJahr>("dataBE", true)[Monat] : [];
	}
	return data;
}
