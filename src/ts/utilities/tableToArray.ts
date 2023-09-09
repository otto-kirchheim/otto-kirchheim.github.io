import { CustomTable, CustomTableTypes, Row } from "../class/CustomTable";
import { CustomHTMLTableElement } from "../interfaces";

export default function tableToArray<T extends CustomTableTypes>(ft: CustomTable<T> | string): T[] {
	if (!(ft instanceof CustomTable)) {
		const table = document.querySelector<CustomHTMLTableElement<T>>(`#${ft}`);
		if (!table) throw new Error("Tabelle nicht gefunden");
		ft = table.instance;
	}
	return ft.getRows().map((row: Row<T>) => row.cells);
}
