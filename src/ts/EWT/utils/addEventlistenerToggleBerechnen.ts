import { CustomTable } from "../../class/CustomTable";
import type { CustomHTMLTableRowElement, IDatenEWT } from "../../interfaces";
import { saveTableDataEWT } from "../../utilities";

export default function addEventlistenerToggleBerechnen(this: CustomTable<IDatenEWT>): void {
	const checkboxes = Array.from(document.querySelectorAll<HTMLInputElement>("#tableE .row-checkbox"));
	for (const checkbox of checkboxes)
		checkbox.addEventListener("click", (event: Event) => {
			event.stopPropagation();
			const row = checkbox.closest<CustomHTMLTableRowElement>("tr")?.data;
			if (!row) return;
			const newValues = { ...row.cells, berechnen: checkbox.checked };
			row.val(newValues);
			saveTableDataEWT(this);
		});
}
