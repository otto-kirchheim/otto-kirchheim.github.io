/*!
 * Customtable
 *
 * Copyright 2022-2023 Jan Otto
 */
import dayjs, { Dayjs } from "dayjs";
import type { CustomHTMLTableElement } from "../interfaces/index.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CustomTableTypes = Record<string, any>;

interface CustomTableOptions<T extends CustomTableTypes> {
	columns: {
		name: string;
		title: string;
		breakpoints?: Breakpoints;
		sortable?: boolean;
		sorted?: boolean;
		direction?: Directions;
		type?: string;
		visible?: boolean;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		parser?: (this: Column<T>, value: any, option?: any) => string | number;
		classes?: string[];
		editing?: CustomTableOptions<T>["editing"];
	}[];
	rows: T[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	empty?: string | (() => string);
	sorting?: { enabled: boolean };
	editing?: {
		enabled: boolean;
		addText?: string;
		editText?: string;
		deleteText?: string;
		deleteAllText?: string;
		addRow: () => void;
		editRow: (row: Row<T>) => void;
		showRow: (row: Row<T>) => void;
		deleteRow: (row: Row<T>) => void;
		deleteAllRows?: () => void;
		customButton?: { text: string; classes: string[]; function: () => void }[] | null;
	};
	classes?: string[];
	customFunction?: {
		beforeDraw?: (this: CustomTable<T>) => void;
		afterDraw?: (this: CustomTable<T>) => void;
		beforeDrawFooter?: (this: CustomTable<T>) => void;
		afterDrawFooter?: (this: CustomTable<T>) => void;
		beforeDrawRows?: (this: CustomTable<T>) => void;
		afterDrawRows?: (this: CustomTable<T>) => void;
		beforeDrawHeader?: (this: CustomTable<T>) => void;
		afterDrawHeader?: (this: CustomTable<T>) => void;
	} | null;
}

interface CustomTableOptionsAll<T extends CustomTableTypes> {
	columns: {
		name: string;
		title: string;
		breakpoints: Breakpoints | null;
		sortable: boolean;
		sorted: boolean;
		direction: Directions | null;
		type: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		parser: (this: Column<T>, value: any, option?: any) => string | number;
		classes: string[];
		visible: boolean;
		editing?: CustomTableOptionsAll<T>["editing"];
	}[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	rows: T[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	empty: string | (() => string);
	sorting: { enabled: boolean };
	editing: {
		enabled: boolean;
		addText: string;
		editText: string;
		deleteText: string;
		deleteAllText: string;
		addRow: () => void;
		editRow: (row: Row<T>) => void;
		showRow: (row: Row<T>) => void;
		deleteRow: (row: Row<T>) => void;
		deleteAllRows: () => void;
		customButton: { text: string; classes: string[]; function: () => void }[] | null;
	};
	classes: string[];
	customFunction?: {
		beforeDraw?: (this: CustomTable<T>) => void;
		afterDraw?: (this: CustomTable<T>) => void;
		beforeDrawFooter?: (this: CustomTable<T>) => void;
		afterDrawFooter?: (this: CustomTable<T>) => void;
		beforeDrawRows?: (this: CustomTable<T>) => void;
		afterDrawRows?: (this: CustomTable<T>) => void;
		beforeDrawHeader?: (this: CustomTable<T>) => void;
		afterDrawHeader?: (this: CustomTable<T>) => void;
	} | null;
}

interface CustomHTMLTableRowElement<T extends CustomTableTypes> extends HTMLTableRowElement {
	data?: Row<T>;
}

type Breakpoints = "xs" | "sm" | "md" | "lg" | "xl" | "xxl";
type Directions = "ASC" | "DESC";

export class Column<T extends CustomTableTypes> {
	public CustomTable: CustomTable<T>;
	public name: string;
	public title: string;
	public breakpoints: Breakpoints | null;
	public sortable: boolean;
	public sorted: boolean;
	public direction: Directions | null;
	public type: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	public parser: (this: Column<T>, value: any, option?: any) => string | number;
	public classes: string[];
	public visible: boolean;
	public editing?: CustomTableOptionsAll<T>["editing"] | null;
	public index: number;
	public $el: HTMLTableCellElement | null = null;
	constructor(table: CustomTable<T>, column: CustomTableOptionsAll<T>["columns"][0], index: number) {
		if (!column.name) throw new Error("Name fehlt");
		if (!column.title && !column.editing) throw new Error("Title fehlt");
		this.index = index;
		this.name = column.name;
		this.title = column.title;
		this.breakpoints = column.breakpoints;
		this.sortable = column.sortable;
		this.sorted = column.sorted;
		this.direction = column.direction;
		this.type = column.type;
		this.parser = column.parser;
		this.classes = column.classes;
		this.visible = column.visible;
		if (column.editing) this.editing = column.editing;
		this.CustomTable = table;
	}
}
export class Columns<T extends CustomTableTypes> {
	public CustomTable: CustomTable<T>;
	public array: Column<T>[] = [];

	constructor(table: CustomTable<T>, columns: CustomTableOptionsAll<T>["columns"]) {
		this.array = columns.map((column, index) => new Column(table, column, index));
		this.CustomTable = table;
	}
}

export class Row<T extends CustomTableTypes> {
	public CustomTable: CustomTable<T>;
	public columns: Columns<T>;
	public cells: T;
	public $el: CustomHTMLTableRowElement<T> | null = null;

	constructor(table: CustomTable<T>, row: T) {
		this.CustomTable = table;
		this.columns = table.columns;
		this.cells = row;
	}

	/** This function removes the current row from the array of rows, and then redraws the table. */
	deleteRow(): void {
		this.CustomTable.rows.array = this.CustomTable.rows.array.filter(row => row !== this);
		this.CustomTable.drawRows();
	}

	/** The function takes a value, sets the cells property to that value, and then calls the drawRows function. */
	val(value: T): void {
		this.cells = value;
		this.CustomTable.drawRows();
	}
}

export class Rows<T extends CustomTableTypes> {
	public CustomTable: CustomTable<T>;
	public array: Array<Row<T>> = [];

	constructor(table: CustomTable<T>, rows: T[]) {
		this.array = rows.map(row => new Row(table, row));
		this.CustomTable = table;
	}
	/** It adds a new row to the table. */
	add(value: T): void {
		this.array.push(new Row(this.CustomTable, value));
		this.CustomTable.drawRows();
	}

	/** The load function takes an array of objects and adds them to the CustomTable. */
	load(array: T[], add = false): void {
		if (!add) this.array.length = 0;
		array.forEach(row => this.array.push(new Row(this.CustomTable, row)));
		this.CustomTable.drawRows();
	}
}

export class CustomTable<T extends CustomTableTypes = CustomTableTypes> {
	public $el: CustomHTMLTableElement<T>;
	public table: string;
	public rows: Rows<T>;
	public columns: Columns<T>;
	public state: { editing: boolean | null; sorting: boolean | null };
	private o = { breakpoints: { xs: 480, sm: 576, md: 768, lg: 992, xl: 1200, xxl: 1400 } };
	public options: CustomTableOptionsAll<T>;

	constructor(initTable: string | CustomHTMLTableElement<T>, options: CustomTableOptions<T>) {
		if (typeof initTable === "string") {
			this.table = initTable;
			const el = document.querySelector<CustomHTMLTableElement<T>>(`#${initTable}`);
			if (!el) throw new Error("Tabelle nicht gefunden");
			this.$el = el;
		} else if (initTable instanceof HTMLTableElement) {
			this.table = initTable.id;
			this.$el = initTable;
		} else throw new Error("Tabellen Fehler");

		this.$el.instance = this;
		this.options = ApplyOptions.bind(this)(options);
		this.state = setState.bind(this)();

		const thead = this.$el.tHead ? this.$el.tHead : this.$el.createTHead();
		const tfoot = this.$el.tFoot ? this.$el.tFoot : this.$el.createTFoot();
		if (this.$el.tBodies.length === 0) this.$el.createTBody();

		this.$el.classList.add(...["customtable", ...this.options.classes]);

		if (this.state.editing) {
			const editingRow: CustomTableOptionsAll<T>["columns"][0] = {
				name: "editing",
				title: "",
				type: "editing",
				breakpoints: null,
				sortable: false,
				editing: this.options.editing,
				classes: ["customtable-editing"],
				visible: true,
				sorted: false,
				direction: null,
				parser: _parser,
			};
			const maxBreakpoint = this.maxBreakpoint(this.options.columns);
			if (Object.values(this.o.breakpoints).includes(maxBreakpoint)) {
				const index = Object.values(this.o.breakpoints).indexOf(maxBreakpoint);
				if (typeof index === "number") {
					const breakpoint = Object.keys(this.o.breakpoints)[index];
					editingRow.classes.push(`customtable-toggle-${breakpoint}`);
				}
			}
			this.options.columns.unshift(editingRow);
		}
		this.columns = new Columns(this, this.options.columns);
		this.rows = new Rows<T>(this, this.options.rows);

		this.draw();

		if (tfoot.childNodes.length === 0) this.$el.deleteTFoot();
		if (thead.childNodes.length === 0) this.$el.deleteTHead();

		console.log(this);
		return this;

		/** It takes an object as an argument and returns an object with the same properties as the argument,
		 * but with default values for the properties that are not defined in the argument */
		function ApplyOptions(this: CustomTable<T>, options: CustomTableOptions<T>): CustomTableOptionsAll<T> {
			if (!options.columns) throw new Error("Spalten fehlen");
			return {
				columns: options.columns.map(column => {
					if (!column.name) throw new Error("Spalten Name fehlt");
					return {
						name: column.name,
						title: column.title ?? "",
						breakpoints: column.breakpoints ?? null,
						sortable: column.sortable ?? false,
						sorted: column.sorted ?? false,
						direction: column.direction ?? null,
						type: column.type ?? "text",
						parser: column.parser ?? _parser,
						classes: column.classes ?? [],
						visible: column.visible ?? true,
					};
				}),
				rows: options.rows ?? [],
				empty: options.empty ?? "Keine Daten gefunden",
				sorting: {
					enabled: options.sorting?.enabled ?? false,
				},
				editing: {
					enabled: options.editing?.enabled ?? false,
					addText: options.editing?.addText ?? "Neue Zeile",
					editText:
						options.editing?.editText ?? '<span class="material-icons-round small-icons" aria-hidden="true">edit</span>',
					deleteText:
						options.editing?.deleteText ?? '<span class="material-icons-round small-icons" aria-hidden="true">delete</span>',
					deleteAllText: options.editing?.deleteAllText ?? "Alle Zeilen löschen",
					addRow:
						options.editing?.addRow ??
						function () {
							return;
						},
					editRow:
						options.editing?.editRow ??
						function () {
							return;
						},
					showRow:
						options.editing?.showRow ??
						function () {
							return;
						},
					deleteRow:
						options.editing?.deleteRow ??
						function () {
							return;
						},
					deleteAllRows: options.editing?.deleteAllRows ?? this.deleteAllRows,
					customButton: options.editing?.customButton ?? null,
				},
				classes: options.classes ?? [],
				customFunction: options.customFunction ?? null,
			};
		}

		function _parser(this: Column<T>, value: string | number): string {
			if (typeof value === "number") value = value.toString();
			switch (this.type) {
				case "text":
				case "number":
					return value;
				case "time":
					return value.length > 0 ? value : "--:--";
				default:
					return value;
			}
		}

		/**
		 * If the sorting property of the options object is truthy, then return the value of the sorting
		 * property of the options object, otherwise return null.
		 * @returns The return value is an object with two properties: sorting and editing.
		 */
		function setState(this: CustomTable<T>): { sorting: boolean | null; editing: boolean | null } {
			return {
				sorting: this.options.sorting?.enabled ?? null,
				editing: this.options.editing?.enabled ?? null,
			};
		}
	}

	/**
	 * It returns an array of the rows in the table.
	 * @returns {object[]} An array of rows.
	 */
	public getRows(): Row<T>[] {
		return this.rows.array;
	}

	/**
	 * It returns an array of arrays, where each inner array is an array of the values of the cells of a
	 * row
	 * @returns An array of arrays.
	 */
	public getArray<T>(): T[] {
		return this.rows.array.map(row => Object.values(row.cells) as T);
	}

	/**
	 * It creates all elements for the table
	 */
	public draw(): void {
		if (this.options.customFunction?.beforeDraw) this.options.customFunction.beforeDraw.call(this);
		this.drawHeader();
		this.drawFooter();
		this.drawRows();
		if (this.options.customFunction?.afterDraw) this.options.customFunction.afterDraw.call(this);
	}

	/**
	 * It creates a footer for the table
	 */
	public drawFooter() {
		if (this.options.customFunction?.beforeDrawFooter) this.options.customFunction.beforeDrawFooter.call(this);

		const tfoot = <HTMLTableSectionElement>this.$el.tFoot;
		tfoot.innerHTML = "";
		if (this.state.editing) {
			const tr = document.createElement("tr");
			tr.classList.add("customtable-editing");

			const td = document.createElement("td");
			td.colSpan = this.columns.array.length + 1;

			const divFooter = document.createElement("div");
			divFooter.classList.add("justify-content-sm-evenly");

			const buttonAdd = createButton(["btn", "btn-primary"], this.options.editing.addText, this.options.editing.addRow);
			const buttonDeleteAlle = createButton(
				["btn", "btn-danger"],
				this.options.editing.deleteAllText,
				this.options.editing.deleteAllRows,
			);

			divFooter.appendChild(buttonAdd);
			if (this.options.editing.customButton && this.options.editing.customButton.length > 0) {
				this.options.editing.customButton.forEach(button => {
					const customButton = createButton(button.classes, button.text, button.function);
					divFooter.appendChild(customButton);
				});
			}

			divFooter.appendChild(buttonDeleteAlle);

			td.appendChild(divFooter);
			tr.appendChild(td);
			tfoot.appendChild(tr);
		}
		if (this.options.customFunction?.afterDrawFooter) this.options.customFunction.afterDrawFooter.call(this);

		// eslint-disable-next-line @typescript-eslint/no-empty-function
		function createButton(classes = ["btn", "btn-primary"], text = "Button", eventlistener = () => {}) {
			const button = document.createElement("button");
			button.classList.add(...classes);
			button.innerText = text;
			button.title = text;
			button.addEventListener("click", event => {
				event.stopPropagation();
				event.preventDefault();
				eventlistener();
			});
			return button;
		}
	}

	/**
	 * It draws the rows of the table
	 */
	public drawRows(): void {
		if (this.options.customFunction?.beforeDrawRows) this.options.customFunction.beforeDrawRows.call(this);

		const thead = this.$el.tHead as HTMLTableSectionElement;
		const tbody = this.$el.tBodies[0];
		const tfoot = this.$el.tFoot as HTMLTableSectionElement;
		tbody.innerHTML = "";
		const sortedColumn = this.columns.array.find(column => column.sorted);
		if (sortedColumn) this.sort(sortedColumn.index, sortedColumn.direction);

		if (this.rows.array.length > 0) {
			for (const row of this.rows.array) {
				const tr: CustomHTMLTableRowElement<T> = document.createElement("tr");
				row.columns.array.forEach(column => {
					if (!column.visible) {
						return;
					}
					const td = document.createElement("td");
					if (column.editing) {
						const divBtnGroup = document.createElement("div");
						divBtnGroup.classList.add("btn-group", "btn-group-sm");
						divBtnGroup.setAttribute("role", "group");

						const createButton = (
							classList: string[],
							text: string,
							eventListener: (row: Row<T>) => void,
							title = "button",
						) => {
							const button = document.createElement("button");
							button.classList.add(...classList);
							button.innerHTML = text;
							button.title = title;
							button.addEventListener("click", event => {
								event.stopPropagation();
								event.preventDefault();
								eventListener(row);
							});
							return button;
						};

						const buttonEdit = createButton(
							["btn", "btn-outline-primary"],
							column.editing.editText,
							this.options.editing.editRow,
							"edit",
						);
						const buttonDelete = createButton(
							["btn", "btn-outline-danger"],
							column.editing.deleteText,
							this.options.editing.deleteRow,
							"delete",
						);

						divBtnGroup.append(buttonEdit);
						divBtnGroup.append(buttonDelete);
						td.appendChild(divBtnGroup);
					} else {
						td.innerHTML = column.parser(row.cells[column.name]).toString();
					}
					if (column.breakpoints) td.dataset.breakpoints = column.breakpoints;
					if (column.classes.length > 0) td.classList.add(...column.classes);
					tr.append(td);
				});
				tr.addEventListener("click", (event: MouseEvent): void => {
					if ((event.view?.innerWidth ?? 0) > this.maxBreakpoint()) return;
					event.stopPropagation();
					this.options.editing.showRow(row);
				});
				tr.data = row;
				row.$el = tr;
				tbody.appendChild(tr);
			}
			thead.style.display = "";
			const dangerBtn = tfoot?.querySelector<HTMLButtonElement>(".btn-danger");
			if (dangerBtn) dangerBtn.style.display = "";
		} else {
			const tr = document.createElement("tr");
			tr.classList.add("customtable-empty");
			const td = document.createElement("td");
			td.colSpan = this.columns.array.length + 1;
			td.innerText = typeof this.options.empty === "function" ? this.options.empty() : this.options.empty;
			tr.appendChild(td);
			tbody.appendChild(tr);

			thead.style.display = "none";
			const dangerBtn = tfoot?.querySelector<HTMLButtonElement>(".btn-danger");
			if (dangerBtn) dangerBtn.style.display = "none";
		}
		if (this.options.customFunction?.afterDrawRows) this.options.customFunction.afterDrawRows.call(this);
	}

	/**
	 * It draws the header of the table
	 */
	public drawHeader() {
		if (this.options.customFunction?.beforeDrawHeader) this.options.customFunction.beforeDrawHeader.call(this);
		const thead = this.$el.tHead as HTMLTableSectionElement;
		thead.innerHTML = "";
		const tr = document.createElement("tr");
		tr.classList.add("customtable-header", "table-primary");
		this.columns.array.forEach(column => {
			if (!column.visible) return;
			const th = document.createElement("th");
			if (column.classes.length > 0) th.classList.add(...column.classes);
			if (column.classes.includes("customtable-editing")) th.classList.remove("customtable-editing");
			th.innerHTML = column.title;
			if (column.breakpoints) th.dataset.breakpoints = column.breakpoints;
			if (this.state.sorting && column.sortable) handleSortable.bind(this)(th, column);
			column.$el = th;
			tr.appendChild(th);
		});

		thead.appendChild(tr);
		if (this.options.customFunction?.afterDrawHeader) this.options.customFunction.afterDrawHeader.call(this);

		function handleSortable(this: CustomTable<T>, th: HTMLTableCellElement, column: Column<T>): void {
			th.classList.add("customtable-sortable");
			const span = document.createElement("span");
			span.classList.add("customtableIcon");
			handleSorted.bind(this)(column, th, span);
			th.append(span);
			th.addEventListener("click", (event: MouseEvent): void => {
				const element = <HTMLTableCellElement>(<HTMLTableCellElement>event.target).closest("th");
				this.onSortClicked(element);
			});
		}

		function handleSorted(
			this: CustomTable<T>,
			column: Column<T>,
			th: HTMLTableCellElement,
			span: HTMLSpanElement,
		): void {
			if (!column.sorted) return span.classList.add("customtable-sort");
			const direction = column.direction ? column.direction.toLowerCase() : "asc";
			this.sort(column.index, <Directions>direction.toUpperCase());
			th.classList.add(`customtable-${direction}`);
			span.classList.add(direction == "asc" ? "customtable-sort-asc" : "customtable-sort-desc");
		}
	}

	private deleteAllRows(): void {
		this.rows.array.length = 0;
		this.draw();
	}

	private sort(columnIndex: number, direction: Directions | null): void {
		type ValueType = string | number | boolean | object | Dayjs;

		const Order = getDirectionOrder(direction);
		const rows = this.rows.array;

		const Sorter = (a: Row<T>, b: Row<T>): number => {
			const aColumn = a.columns.array[columnIndex].name;
			const aValue: ValueType = a.cells[aColumn];

			const bColumn = b.columns.array[columnIndex].name;
			const bValue: ValueType = b.cells[bColumn];

			if (!aValue || !bValue) throw new Error("Daten zum Sortieren dürfen nicht leer sein");

			if (dayjs.isDayjs(aValue) && dayjs.isDayjs(bValue)) return Number(bValue.isAfter(aValue)) * Order[1];

			const normalizedA = normalizeValue(aValue);
			const normalizedB = normalizeValue(bValue);

			return normalizedB.localeCompare(normalizedA, undefined, { numeric: true }) * Order[1];
		};

		rows.sort(Sorter);

		function normalizeValue(value: ValueType): string {
			switch (typeof value) {
				case "string":
					return value.toLowerCase();
				case "number":
				case "boolean":
					return value.toString();
				case "object":
					return dayjs.isDayjs(value) ? value.toISOString() : JSON.stringify(value);
				default:
					return String(value);
			}
		}

		function getDirectionOrder(direction: Directions | null): number[] {
			const directionOrder = {
				ASC: [1, -1],
				DESC: [-1, 1],
			};
			return direction ? directionOrder[direction] : directionOrder.ASC;
		}
	}

	private onSortClicked(element: HTMLTableCellElement): void {
		const column = this.columns.array.find(column => column.$el == element);
		if (!column) throw new Error("Spalte nicht gefunden");
		const direction = column.direction === "ASC" ? "DESC" : "ASC";
		this.columns.array.forEach(column => {
			column.sorted = false;
			column.direction = null;
		});
		column.direction = direction;
		column.sorted = true;
		this.draw();
	}

	/**
	 * It takes an array of objects, and returns an array of unique values from the "breakpoints" property
	 * of each object.
	 * @param {} array - The array of columns to get the breakpoints from. If not provided, it will use the
	 * columns.array property.
	 * @returns {string[]} An array of unique breakpoints.
	 */
	public breakpoints(array: Column<T>[] | CustomTableOptionsAll<T>["columns"]): Breakpoints[] | [] {
		if (!array) array = this.columns.array;
		return <Breakpoints[] | []>(
			Array.from(new Set(array.map(column => column.breakpoints).flatMap(f => (f ? f.split(" ") : []))))
		);
	}

	/** It returns the largest breakpoint value from an array of breakpoint names */
	public maxBreakpoint(array: Column<T>[] | CustomTableOptionsAll<T>["columns"] = this.columns.array): number {
		return Math.max(...this.breakpoints(array).map(breakpoint => this.o.breakpoints[breakpoint]));
	}
}

export function createCustomTable<T extends CustomTableTypes>(
	table: string | CustomHTMLTableElement<T>,
	options: CustomTableOptions<T>,
): CustomTable<T> {
	return new CustomTable<T>(table, options);
}
