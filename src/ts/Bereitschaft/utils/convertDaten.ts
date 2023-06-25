import type { IDaten } from "../../interfaces";
import { Storage } from "../../utilities";

export function DataBZ(data?: IDaten["BZ"]): IDaten["BZ"] {
	if (data === undefined) {
		if (!Storage.check("dataBZ")) return [];
		data = Storage.get("dataBZ");
	}
	if (data === undefined) return [];
	return data;
}

export function DataBE(data?: IDaten["BE"]): IDaten["BE"] {
	if (data === undefined) {
		if (!Storage.check("dataBE")) return [];
		data = Storage.get("dataBE");
	}
	if (data === undefined) return [];
	return data;
}
