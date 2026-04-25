import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { createCustomTable } from '@/infrastructure/table/CustomTable';
import { registerAppStartTask } from '@/core';
import type { IVorgabenU } from '@/types';
import { default as buttonDisable } from '@/infrastructure/ui/buttonDisable';
import { confirmDeleteAllRows } from '@/infrastructure/data/confirmDeleteAllRows';
import { isEwtInMonat } from '@/infrastructure/date/getMonatFromItem';
import Storage from '@/infrastructure/storage/Storage';
import { createOnChangeHandler } from '@/infrastructure/autoSave/autoSave';
import { default as saveDaten } from '@/infrastructure/data/saveDaten';
import dayjs from '@/infrastructure/date/configDayjs';
import { EditorModalEWT, ShowModalEWT, createAddModalEWT } from './components';
import download from '@/infrastructure/data/download';
import { attachBerechnenToggleListeners, recalculateEwtMonat, getEwtDaten, persistEwtTableData } from './utils';

registerAppStartTask(() => {
  const tagParser = (value: unknown) => {
      const s = value as string;
      const d = dayjs(s);
      return d.isValid() ? d.format('dd DD.MM.') : s;
    },
    berechnenParser = (value: unknown): string => {
      return `<div class="form-check form-switch"><input type="checkbox" class="row-checkbox form-check-input"${
        value ? ' checked' : ''
      }></div>`;
    },
    schichtParser = (value: unknown): string => {
      switch (value as string) {
        case 'T':
          return 'Tag';
        case 'N':
          return 'Nacht';
        case 'BN':
          return "<span class='SchichtBereitschaft'>Bereitschaft<br>+ Nacht</span>";
        case 'S':
          return 'Sonder';
        default:
          return 'Unbekannt';
      }
    },
    ftE = createCustomTable('tableE', {
      columns: [
        {
          name: 'tagE',
          title: 'Tag',
          sortable: true,
          sorted: true,
          direction: 'ASC',
          parser: tagParser,
        },
        { name: 'buchungstagE', title: 'Buchungs\n-Tag', breakpoints: 'xxl', parser: tagParser },
        { name: 'eOrtE', title: 'Einsatzort', classes: ['custom-text-truncate'], type: 'text' },
        { name: 'schichtE', title: 'Schicht', parser: schichtParser, type: 'time' },
        { name: 'abWE', title: 'Ab Wohnung', breakpoints: 'xl', type: 'time' },
        { name: 'beginE', title: 'Arbeitszeit Von', breakpoints: 'md', type: 'time' },
        { name: 'ab1E', title: 'Ab 1.Tgk.-St.', breakpoints: 'lg', type: 'time' },
        { name: 'anEE', title: 'An Einsatzort', breakpoints: 'lg', type: 'time' },
        { name: 'abEE', title: 'Ab Einsatzort', breakpoints: 'lg', type: 'time' },
        { name: 'an1E', title: 'An 1.Tgk.-St.', breakpoints: 'lg', type: 'time' },
        { name: 'endeE', title: 'Arbeitszeit Bis', breakpoints: 'md', type: 'time' },
        { name: 'anWE', title: 'An Wohnung', breakpoints: 'xl', type: 'time' },
        { name: 'berechnen', title: 'Berechnen?', parser: berechnenParser, breakpoints: 'xxl' },
      ],
      rows: getEwtDaten(undefined, undefined, { scope: 'all' }),
      sorting: { enabled: true },
      onChange: createOnChangeHandler('EWT'),
      editing: {
        enabled: true,
        addRow: () => {
          EditorModalEWT(ftE, 'Anwesenheit hinzufügen');
        },
        editRow: row => {
          EditorModalEWT(row, 'Anwesenheit bearbeiten');
        },
        showRow: row => {
          ShowModalEWT(row, 'Anwesenheit anzeigen');
        },
        deleteRow: row => {
          row.deleteRow();
          persistEwtTableData(ftE);
        },
        deleteAllRows: () => {
          confirmDeleteAllRows({
            table: ftE,
            rowFilter: (cells, m) => isEwtInMonat(cells, m),
            persist: persistEwtTableData,
          });
        },
        customButton: [
          {
            classes: ['btn', 'btn-secondary'],
            text: 'Alle Zeiten entfernen',
            function: () => {
              createSnackBar({
                message:
                  'Möchtest du wirklich alle Zeiten entfernen?<br /><small>(nur bei Zeilen die auch berechnet werden)</small>',
                icon: 'question',
                status: 'error',
                dismissible: false,
                timeout: false,
                fixed: true,
                actions: [
                  {
                    text: 'Ja',
                    function: () => {
                      const activeMonat = Storage.get<number>('Monat', { default: dayjs().month() + 1 });

                      [...ftE.rows.array].forEach(row => {
                        if (row._state === 'deleted') return;
                        if (!isEwtInMonat(row.cells, activeMonat)) return;
                        if (!row.cells.berechnen) return;

                        row.val({
                          ...row.cells,
                          abWE: '',
                          ab1E: '',
                          anEE: '',
                          beginE: '',
                          endeE: '',
                          abEE: '',
                          an1E: '',
                          anWE: '',
                        });
                      });

                      buttonDisable(false);
                      persistEwtTableData(ftE);
                    },
                    dismiss: true,
                    class: ['text-danger'],
                  },
                  { text: 'Nein', dismiss: true, class: ['text-primary'] },
                ],
              });
            },
          },
        ],
      },
      customFunction: {
        afterDrawRows: attachBerechnenToggleListeners,
      },
    });

  const btnZb = document.querySelector<HTMLButtonElement>('#btnZb');
  btnZb?.addEventListener('click', () => {
    const monat = Storage.get<number>('Monat', { default: 0 });
    recalculateEwtMonat({
      monat,
      daten: getEwtDaten(undefined, monat),
      vorgabenU: Storage.get<IVorgabenU>('VorgabenU', { check: true }),
      tableE: ftE,
    });
  });

  const btnSaveE = document.querySelector<HTMLButtonElement>('#btnSaveE');
  btnSaveE?.addEventListener('click', () => {
    saveDaten(btnSaveE);
  });

  const btnDownloadE = document.querySelector<HTMLButtonElement>('#btnDownloadE');
  btnDownloadE?.addEventListener('click', () => {
    download(btnDownloadE, 'E');
  });

  const btnESEE = document.querySelector<HTMLButtonElement>('#btnESEE');
  btnESEE?.addEventListener('click', () => createAddModalEWT(ftE));

  const monat = Storage.get<number>('Monat', { default: dayjs().month() + 1 });
  ftE.rows.setFilter(row => isEwtInMonat(row, monat));
});
