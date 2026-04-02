import { createSnackBar } from '../class/CustomSnackbar';
import { createCustomTable } from '../class/CustomTable';
import type { IVorgabenU } from '../interfaces';
import { isEwtInMonat, Storage, buttonDisable, createOnChangeHandler, saveDaten } from '../utilities';
import dayjs from '../utilities/configDayjs';
import { EditorModalEWT, ShowModalEWT, createAddModalEWT } from './components';
import download from '../utilities/download';
import { attachBerechnenToggleListeners, recalculateEwtMonat, getEwtDaten, persistEwtTableData } from './utils';

window.addEventListener('load', () => {
  const tagParser = (value: string) => {
      const d = dayjs(value);
      return d.isValid() ? d.format('dd DD.MM.') : value;
    },
    berechnenParser = (value: boolean): string => {
      return `<div class="form-check form-switch"><input type="checkbox" class="row-checkbox form-check-input"${
        value ? ' checked' : ''
      }></div>`;
    },
    schichtParser = (value: string): string => {
      switch (value) {
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
                  const activeMonat = Storage.get<number>('Monat', { default: dayjs().month() + 1 });
                  const monthRows = [...ftE.rows.array].filter(row => isEwtInMonat(row.cells, activeMonat));
                  monthRows.forEach(row => row.deleteRow());
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
      jahr: Storage.get<number>('Jahr', { check: true }),
      daten: getEwtDaten(undefined, monat),
      vorgabenU: Storage.get<IVorgabenU>('VorgabenU', { check: true }),
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
  btnESEE?.addEventListener('click', createAddModalEWT);

  const monat = Storage.get<number>('Monat', { default: dayjs().month() + 1 });
  ftE.rows.setFilter(row => isEwtInMonat(row, monat));
});
