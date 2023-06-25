import { CustomTable, Row } from "../class/CustomTable";
import { CustomHTMLTableElement } from "../interfaces";

export default function tableToArray<T>(ft: CustomTable | string): T[] {
	if (!(ft instanceof CustomTable)) {
		const table = document.querySelector<CustomHTMLTableElement>(`#${ft}`);
		if (!table) throw new Error("Tabelle nicht gefunden");
		ft = table.instance;
	}
	return ft.getRows().map((row: Row) => row.cells as T);
}
