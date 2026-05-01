import { createSnackBar } from '../ui/CustomSnackbar';
import type { CustomTable, CustomTableTypes } from '../table/CustomTable';
import buttonDisable from '../ui/buttonDisable';
import { getStoredMonatJahr } from '../date/dateStorage';

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
        class: ['text-danger'],
      },
      { text: 'Nein', dismiss: true, class: ['text-primary'] },
    ],
  });
}
