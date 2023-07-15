import type { IDaten } from "../../interfaces";
import { Storage } from "../../utilities";

export function DataBZ(data?: IDaten["BZ"]): IDaten["BZ"] {
	if (data === undefined) {
		data = Storage.check("dataBZ") ? Storage.get("dataBZ") ?? [] : [];
	}
	return data;
}

export function DataBE(data?: IDaten["BE"]): IDaten["BE"] {
	if (data === undefined) {
		data = Storage.check("dataBE") ? Storage.get("dataBE") ?? [] : [];
	}
	return data;
}
