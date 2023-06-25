import type { IDaten } from "../../interfaces";
import { Storage } from "../../utilities";

export default function DataN(data?: IDaten["N"]): IDaten["N"] {
	if (data !== undefined) return data;
	if (Storage.check("dataN")) {
		data = Storage.get<IDaten["N"]>("dataN");
		return data ?? [];
	}
	return [];
}
