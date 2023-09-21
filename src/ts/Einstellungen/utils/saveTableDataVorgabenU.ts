import { CustomTable } from "../../class/CustomTable";
import type { IVorgabenU, IVorgabenUvorgabenB } from "../../interfaces";
import Storage from "../../utilities/Storage";
import tableToArray from "../../utilities/tableToArray";

export default function saveTableDataVorgabenU(ft: CustomTable<IVorgabenUvorgabenB>): IVorgabenU {
	const data = Storage.get<IVorgabenU>("VorgabenU", { check: true });
	data.vorgabenB = Object.fromEntries(tableToArray<IVorgabenUvorgabenB>(ft).entries());
	Storage.set("VorgabenU", data);

	return data;
}
