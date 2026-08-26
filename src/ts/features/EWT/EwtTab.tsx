import { render } from 'preact';
import { useEffect } from 'preact/hooks';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { createCustomTable } from '@/infrastructure/table/CustomTable';
import { openHelpModal } from '@/core';
import type { IVorgabenU } from '@/types';
import { default as buttonDisable } from '@/infrastructure/ui/buttonDisable';
import { confirmDeleteAllRows } from '@/infrastructure/data/confirmDeleteAllRows';
import { isEwtInMonat } from '@/infrastructure/date/getMonatFromItem';
import Storage from '@/infrastructure/storage/Storage';
import { createOnChangeHandler } from '@/infrastructure/autoSave/autoSave';
import { default as saveDaten } from '@/infrastructure/data/saveDaten';
import { registerAutoSaveButton } from '@/infrastructure/autoSave/autoSaveIndicator';
import { bindClickHandlers } from '@/infrastructure/ui/bindClickHandlers';
import dayjs from '@/infrastructure/date/configDayjs';
import { EditorModalEWT, ShowModalEWT, createAddModalEWT } from './components';
import generatePDF from '@/infrastructure/data/generatePDF';
import { attachBerechnenToggleListeners, recalculateEwtMonat, getEwtDaten, persistEwtTableData } from './utils';

function EwtTab() {
  useEffect(() => {
    const tagParser = (value: unknown) => {
        const s = value as string;
        const d = dayjs(s);
        return d.isValid() ? d.format('dd DD.MM.') : s;
      },
      // Beide Parser erzeugen festes Markup ohne Benutzereingaben (Boolean bzw.
      // Switch über feste Fälle) — nur deshalb dürfen die Spalten `html: true` setzen.
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
          case 'SP':
            return 'Spät';
          case 'BN': //legacy: BN = Bereitschaft + Nacht
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
            name: 'Tag',
            title: 'Tag',
            sortable: true,
            sorted: true,
            direction: 'ASC',
            parser: tagParser,
          },
          { name: 'Buchungstag', title: 'Buchungs\n-Tag', breakpoints: 'xxl', parser: tagParser },
          { name: 'Einsatzort', title: 'Einsatzort', classes: ['custom-text-truncate'], type: 'text' },
          { name: 'Schicht', title: 'Schicht', parser: schichtParser, type: 'time', html: true },
          { name: 'abWE', title: 'Ab Wohnung', breakpoints: 'xl', type: 'time' },
          { name: 'beginE', title: 'Arbeitszeit Von', breakpoints: 'md', type: 'time' },
          { name: 'ab1E', title: 'Ab 1.Tgk.-St.', breakpoints: 'lg', type: 'time' },
          { name: 'anEE', title: 'An Einsatzort', breakpoints: 'lg', type: 'time' },
          { name: 'abEE', title: 'Ab Einsatzort', breakpoints: 'lg', type: 'time' },
          { name: 'an1E', title: 'An 1.Tgk.-St.', breakpoints: 'lg', type: 'time' },
          { name: 'endeE', title: 'Arbeitszeit Bis', breakpoints: 'md', type: 'time' },
          { name: 'anWE', title: 'An Wohnung', breakpoints: 'xl', type: 'time' },
          { name: 'berechnen', title: 'Berechnen?', parser: berechnenParser, breakpoints: 'xxl', html: true },
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

    const unbindButtons = bindClickHandlers([
      [
        'btnZb',
        () => {
          const monat = Storage.get<number>('Monat', { default: 0 });
          recalculateEwtMonat({
            monat,
            daten: getEwtDaten(undefined, monat),
            vorgabenU: Storage.get<IVorgabenU>('VorgabenU', { check: true }),
            tableE: ftE,
          });
        },
      ],
      ['btnSaveE', btn => saveDaten(btn)],
      ['btnDownloadE', btn => generatePDF(btn, 'E')],
      ['btnESEE', () => createAddModalEWT(ftE)],
      ['btnHelpEWT', () => openHelpModal('tab.ewt')],
    ]);

    registerAutoSaveButton('btnSaveE', ['EWT']);

    const monat = Storage.get<number>('Monat', { default: dayjs().month() + 1 });
    ftE.rows.setFilter(row => isEwtInMonat(row, monat));

    return unbindButtons;
  }, []);

  return (
    <div class="container-lg text-center">
      <div class="row justify-content-center">
        <h1 class="d-inline-flex align-items-center justify-content-center gap-2">
          EWT
          <button type="button" class="btn btn-sm btn-link p-0" id="btnHelpEWT" aria-label="Hilfe anzeigen">
            <span class="material-icons-round align-middle" style="font-size: 1.25rem">
              help_outline
            </span>
          </button>
        </h1>
        <h4 id="MonatE"></h4>
      </div>

      <div class="container">
        <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-4 justify-content-center g-3 my-3 w200">
          <div class="col d-grid">
            <button type="button" class="btn btn-primary" id="btnESEE" data-disabler>
              <span class="material-icons-round big-icons">add_circle_outlined</span>
              Anwesenheit
            </button>
          </div>
          <div class="col d-grid">
            <button class="btn btn-primary" type="button" id="btnZb" data-disabler>
              <span class="material-icons-round big-icons">calculate</span>
              Berechnen
            </button>
          </div>
          <div class="col d-grid">
            <button class="btn btn-success" type="button" id="btnSaveE" data-disabler>
              <span class="material-icons-round big-icons">save</span>
              Speichern
            </button>
          </div>
          <div class="col d-grid">
            <button class="btn btn-secondary" type="button" id="btnDownloadE" data-disabler>
              <span class="material-icons-round big-icons">download</span>
              PDF erzeugen
            </button>
          </div>
        </div>
      </div>
      <hr />

      <div class="table-responsive">
        <table id="tableE" class="table table-bordered table-striped table-hover align-middle" aria-label="EWT"></table>
      </div>
    </div>
  );
}

export function mountEwtTab(): void {
  const container = document.querySelector<HTMLDivElement>('#ewt-root');
  if (!container) return;

  render(<EwtTab />, container);
}

export function unmountEwtTab(): void {
  const container = document.querySelector<HTMLDivElement>('#ewt-root');
  if (!container) return;

  render(null, container);
}
