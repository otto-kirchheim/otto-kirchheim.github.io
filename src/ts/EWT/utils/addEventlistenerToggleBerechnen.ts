import { saveTableDataEWT } from ".";
import { CustomTable } from "../../class/CustomTable";
import type { CustomHTMLTableRowElement, IDatenEWT } from "../../interfaces";

export default function addEventlistenerToggleBerechnen(this: CustomTable<IDatenEWT>): void {
	const checkboxes = document.querySelectorAll<HTMLInputElement>("#tableE .row-checkbox");
	checkboxes.forEach(checkbox =>
		checkbox.addEventListener("click", (event: Event) => {
			event.stopPropagation();
			const row = checkbox.closest<CustomHTMLTableRowElement<IDatenEWT>>("tr")?.data;
			if (!row) return;
			const newValues = { ...row.cells, berechnen: checkbox.checked };
			row.val(newValues);
			saveTableDataEWT(this);
		}),
	);
}
