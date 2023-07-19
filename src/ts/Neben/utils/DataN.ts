import type { IDatenNJahr, IMonatsDaten } from "../../interfaces";
import { Storage } from "../../utilities";

export default function DataN(data?: IMonatsDaten["N"], Monat?: number): IMonatsDaten["N"] {
	if (data === undefined) {
		if (!Monat) Monat = Storage.get<number>("Monat");
		data = Storage.check("dataN") ? Storage.get<IDatenNJahr>("dataN")?.[Monat] ?? [] : [];
	}
	return data;
}
