import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { createCustomTable } from '@/infrastructure/table/CustomTable';
import { onEvent, registerAppStartTask } from '@/core';
import { confirmDeleteAllRows } from '@/infrastructure/data/confirmDeleteAllRows';
import { getMonatFromN } from '@/infrastructure/date/getMonatFromItem';
import Storage from '@/infrastructure/storage/Storage';
import { createOnChangeHandler } from '@/infrastructure/autoSave/autoSave';
import { default as saveDaten } from '@/infrastructure/data/saveDaten';
import dayjs from '@/infrastructure/date/configDayjs';
import download from '@/infrastructure/data/download';
import { EditorModalNeben, ShowModalNeben, createAddModalNeben } from './components';
import { getNebengeldDaten, persistNebengeldTableData, syncNebengeldTimesFromEwtRows } from './utils';

registerAppStartTask(() => {
  onEvent('ewt:persisted', ({ rows }) => syncNebengeldTimesFromEwtRows(rows));

  const Jahr: number = Storage.get('Jahr', { default: dayjs().year() });

  const checkIfGreater2024 = (Jahr: number, showError?: boolean) => {
    const checked: boolean = Jahr >= 2024;
    if (!checked && showError)
      createSnackBar({
        message: 'Sorry, für 2023 gibt es keine Nebengelder mehr...',
        icon: '!',
        status: 'error',
      });

    return checked;
  };

  const getEmptyText = (Jahr: number) => (checkIfGreater2024(Jahr) ? 'Keine Daten gefunden' : 'Neu ab 2024');

  const ftN = createCustomTable('tableN', {
    columns: [
      { name: 'tagN', title: 'Tag', sortable: true, sorted: true, direction: 'ASC' },
      { name: 'beginN', title: 'Arbeit Von', longTitle: 'Arbeitszeit Von', type: 'time' },
      { name: 'endeN', title: 'Arbeit Bis', longTitle: 'Arbeitszeit Bis', type: 'time' },
      { name: 'anzahl040N', title: '040', longTitle: '040 Fahrentschädigung', breakpoints: 'md', type: 'number' },
      {
        name: 'auftragN',
        title: 'Auftragsnummer',
        breakpoints: 'md',
        parser: (value: unknown) => { const s = value as string; return s ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '-'; },
      },
    ],
    empty: () => getEmptyText(Jahr),
    rows: getNebengeldDaten(undefined, undefined, { scope: 'all' }),
    sorting: { enabled: true },
    onChange: createOnChangeHandler('N'),
    editing: {
      enabled: true,
      addRow: () => {
        EditorModalNeben(ftN, 'Nebenbezug hinzufügen');
      },
      editRow: row => {
        EditorModalNeben(row, 'Nebenbezug bearbeiten');
      },
      showRow: row => {
        ShowModalNeben(row, 'Nebenbezug anzeigen');
      },
      deleteRow: row => {
        row.deleteRow();
        persistNebengeldTableData(ftN);
      },
      deleteAllRows: () => {
        confirmDeleteAllRows({
          table: ftN,
          rowFilter: (cells, m) => getMonatFromN(cells) === m,
          persist: persistNebengeldTableData,
        });
      },
    },
  });

  const btnESN = document.querySelector<HTMLButtonElement>('#btnESN');
  btnESN?.addEventListener('click', () => {
    if (checkIfGreater2024(Jahr, true)) createAddModalNeben(ftN);
  });

  const btnSaveN = document.querySelector<HTMLButtonElement>('#btnSaveN');
  btnSaveN?.addEventListener('click', () => {
    saveDaten(btnSaveN);
  });

  const btnDownloadN = document.querySelector<HTMLButtonElement>('#btnDownloadN');
  btnDownloadN?.addEventListener('click', () => {
    if (checkIfGreater2024(Jahr, true)) download(btnDownloadN, 'N');
  });

  const monat = Storage.get<number>('Monat', { default: dayjs().month() + 1 });
  ftN.rows.setFilter(
    row => getMonatFromN(row) === monat && checkIfGreater2024(Storage.get<number>('Jahr', { default: Jahr })),
  );
});
