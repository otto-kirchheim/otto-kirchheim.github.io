import { persistEwtTableData } from '.';
import type { CustomTable } from '@/shared/ui/custom-table/CustomTable';
import type { CustomHTMLTableRowElement, IDatenEWT } from '@/types';

/**
 * `afterDrawRows`-Hook der EWT-Tabelle (`this` ist die Tabelle): hängt an jeden "Berechnen?"-Schalter in `#tableE` einen
 * Klick-Handler, der `berechnen` der Zeile setzt und die Tabelle speichert. `stopPropagation` hält den Klick von der
 * Zeile fern.
 */
export default function attachBerechnenToggleListeners(this: CustomTable<IDatenEWT>): void {
  const checkboxes = document.querySelectorAll<HTMLInputElement>('#tableE .row-checkbox');
  checkboxes.forEach(checkbox =>
    checkbox.addEventListener('click', (event: Event) => {
      event.stopPropagation();
      const row = checkbox.closest<CustomHTMLTableRowElement<IDatenEWT>>('tr')?.data;
      if (!row) return;
      const newValues = { ...row.cells, berechnen: checkbox.checked };
      row.val(newValues);
      persistEwtTableData(this);
    }),
  );
}
