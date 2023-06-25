import { CustomTable } from "../class/CustomTable";
import { IVorgabenU } from "../interfaces";
import Storage from "./Storage";
import tableToArray from "./tableToArray";

export default function saveTableData<T>(ft: CustomTable): T {
	let data;
	switch (ft.table) {
		case "tableBZ":
			data = tableToArray(ft);
			Storage.set("dataBZ", data);
			break;
		case "tableBE":
			data = tableToArray(ft);
			Storage.set("dataBE", data);
			break;
		case "tableE":
			data = tableToArray(ft);
			Storage.set("dataE", data);
			break;
		case "tableN":
			data = tableToArray(ft);
			Storage.set("dataN", data);
			break;
		case "tableVE":
			data = Storage.get<IVorgabenU>("VorgabenU");
			data.vorgabenB = Object.fromEntries(tableToArray(ft).entries()) as IVorgabenU["vorgabenB"];
			Storage.set("VorgabenU", data);
			break;
		default:
			throw new Error("Tabelle unbekannt");
	}
	return data as T;
}
