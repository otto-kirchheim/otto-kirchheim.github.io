import { createSnackBar } from '../../shared/ui/snackbar/CustomSnackbar';
import type { CustomTable, CustomTableTypes } from '../../shared/ui/custom-table/CustomTable';
import buttonDisable from '../../shared/ui/button-loading/buttonDisable';
import { getStoredMonatJahr } from '@/shared/lib/date/dateStorage';

/**
 * Fragt per Snackbar nach und löscht bei "Ja" alle Zeilen des gespeicherten Monats, aktiviert die Buttons wieder und schreibt die Tabelle über `persist`.
 *
 * @typeParam T - Zeilentyp der Tabelle.
 * @param options - `table`: Tabelle, `rowFilter`: wählt Zeilen eines Monats, `persist`: speichert die Tabelle.
 */
export function confirmDeleteAllRows<T extends CustomTableTypes>(options: {
  table: CustomTable<T>;
  rowFilter: (cells: T, monat: number) => boolean;
  persist: (table: CustomTable<T>) => void;
}): void {
  const { table, rowFilter, persist } = options;

  createSnackBar({
    message: 'Möchtest du wirklich alle Zeilen löschen?',
    icon: 'question',
    status: 'error',
    dismissible: false,
    timeout: false,
    fixed: true,
    actions: [
      {
        text: 'Ja',
        function: () => {
          const activeMonat = getStoredMonatJahr().monat;
          const monthRows = [...table.rows.array].filter(row => rowFilter(row.cells, activeMonat));
          monthRows.forEach(row => row.deleteRow());
          buttonDisable(false);
          persist(table);
        },
        dismiss: true,
      },
      { text: 'Nein', dismiss: true },
    ],
  });
}
