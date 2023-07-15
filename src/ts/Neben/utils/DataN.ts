import type { IDaten } from "../../interfaces";
import { Storage } from "../../utilities";

export default function DataN(data?: IDaten["N"]): IDaten["N"] {
	if (data === undefined) {
		data = Storage.check("dataN") ? Storage.get("dataN") ?? [] : [];
	}
	return data;
}
