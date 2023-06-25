import { CustomTable, Row } from "../class/CustomTable.js";

export interface CustomHTMLDivElement extends HTMLDivElement {
	row: Row | CustomTable | null;
}

export interface CustomHTMLTableElement extends HTMLTableElement {
	instance: CustomTable;
}

export interface CustomHTMLTableRowElement extends HTMLTableRowElement {
	data: Row;
}
