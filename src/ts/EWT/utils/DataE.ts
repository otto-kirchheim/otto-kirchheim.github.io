import type { IDaten } from "../../interfaces";
import { Storage } from "../../utilities";

export function DataE(data?: IDaten["EWT"]): IDaten["EWT"] {
	if (data === undefined) {
		data = Storage.check("dataE") ? Storage.get("dataE") ?? [] : [];
	}
	return data;
}
