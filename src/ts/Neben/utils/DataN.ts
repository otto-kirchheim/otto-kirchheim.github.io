import type { IDatenNJahr, IMonatsDaten } from "../../interfaces";
import { Storage } from "../../utilities";

export default function DataN(data?: IMonatsDaten["N"], Monat?: number): IMonatsDaten["N"] {
	if (!(Storage.check("Benutzer") && Storage.check("accessToken"))) return [];
	const Jahr = Storage.get("Jahr", { default: new Date().getFullYear() });
	if (Jahr < 2024) return [];

	if (data === undefined) {
		if (!Monat)
			if (Storage.check("Monat")) Monat = Storage.get<number>("Monat", true);
			else return [];
		data = Storage.check("dataN") ? Storage.get<IDatenNJahr>("dataN", true)[Monat] : [];
	}
	return data;
}
