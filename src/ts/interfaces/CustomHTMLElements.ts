import { CustomTable, CustomTableTypes, Row } from "../class/CustomTable.js";

export interface CustomHTMLDivElement<T extends CustomTableTypes = CustomTableTypes> extends HTMLDivElement {
	row: Row<T> | CustomTable<T> | null;
}

export interface CustomHTMLTableElement<T extends CustomTableTypes = CustomTableTypes> extends HTMLTableElement {
	instance: CustomTable<T>;
}

export interface CustomHTMLTableRowElement<T extends CustomTableTypes = CustomTableTypes> extends HTMLTableRowElement {
	data: Row<T>;
}
