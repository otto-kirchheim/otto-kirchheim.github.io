import { useEffect } from 'react';
import { mount, unmount } from '@/infrastructure/ui';

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
        // DB-Schalter-Markup (`db-switch` > `label` > `input[role=switch]`); die Beschriftung
        // steht in der Spaltenueberschrift, deshalb nur ein `aria-label` am Feld.
        return `<div class="db-switch"><label><input type="checkbox" role="switch" class="row-checkbox" aria-label="Berechnen"${
          value ? ' checked' : ''
        }></label></div>`;
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
    <div className="container-lg text-center">
      <div className="row justify-content-center">
        <h1 className="d-inline-flex align-items-center justify-content-center gap-2">
          EWT
          <button type="button" className="btn btn-sm btn-link p-0" id="btnHelpEWT" aria-label="Hilfe anzeigen">
            <span className="db-icon align-middle db-font-size-md" data-icon="question_mark_circle" />
          </button>
        </h1>
        <h4 id="MonatE"></h4>
      </div>

      <div className="container">
        <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-4 justify-content-center g-3 my-3 w200">
          <div className="col d-grid">
            <button type="button" className="btn btn-primary" id="btnESEE" data-disabler>
              <span className="db-icon" data-icon="plus" />
              Anwesenheit
            </button>
          </div>
          <div className="col d-grid">
            <button className="btn btn-primary" type="button" id="btnZb" data-disabler>
              <span className="db-icon" data-icon="bar_chart" />
              Berechnen
            </button>
          </div>
          <div className="col d-grid">
            <button className="btn btn-success" type="button" id="btnSaveE" data-disabler>
              <span className="db-icon" data-icon="save" />
              Speichern
            </button>
          </div>
          <div className="col d-grid">
            <button className="btn btn-secondary" type="button" id="btnDownloadE" data-disabler>
              <span className="db-icon" data-icon="download" />
              PDF erzeugen
            </button>
          </div>
        </div>
      </div>
      <hr />

      <div
        className="db-table table-responsive"
        data-width="full"
        data-variant="zebra"
        data-divider="both"
        data-size="small"
      >
        <table id="tableE" className="align-middle" aria-label="EWT"></table>
      </div>
    </div>
  );
}

export function mountEwtTab(): void {
  const container = document.querySelector<HTMLDivElement>('#ewt-root');
  if (!container) return;

  mount(container, <EwtTab />);
}

export function unmountEwtTab(): void {
  const container = document.querySelector<HTMLDivElement>('#ewt-root');
  if (!container) return;

  unmount(container);
}
