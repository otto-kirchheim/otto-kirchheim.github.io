import type { IDaten } from "../../interfaces";
import { Storage } from "../../utilities";

export function DataE(data?: IDaten["EWT"]): IDaten["EWT"] {
	if (data === undefined) {
		if (!Storage.check("dataE")) return [];
		data = Storage.get<IDaten["EWT"]>("dataE");
	}

	if (data === undefined) return [];
	return data;
}
