import { useEffect } from 'react';
import { mount, unmount } from '@/infrastructure/ui';

import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { createCustomTable } from '@/infrastructure/table/CustomTable';
import { openHelpModal } from '@/core';
import { confirmDeleteAllRows } from '@/infrastructure/data/confirmDeleteAllRows';
import { getMonatFromN } from '@/infrastructure/date/getMonatFromItem';
import Storage from '@/infrastructure/storage/Storage';
import { createOnChangeHandler } from '@/infrastructure/autoSave/autoSave';
import { default as saveDaten } from '@/infrastructure/data/saveDaten';
import { registerAutoSaveButton } from '@/infrastructure/autoSave/autoSaveIndicator';
import { bindClickHandlers } from '@/infrastructure/ui/bindClickHandlers';
import dayjs from '@/infrastructure/date/configDayjs';
import generatePDF from '@/infrastructure/data/generatePDF';
import { EditorModalNeben, ShowModalNeben, createAddModalNeben } from './components';
import { getNebengeldDaten, persistNebengeldTableData } from './utils';

function NebenTab() {
  useEffect(() => {
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
        { name: 'Tag', title: 'Tag', sortable: true, sorted: true, direction: 'ASC' },
        { name: 'Beginn', title: 'Arbeit Von', longTitle: 'Arbeitszeit Von', type: 'time' },
        { name: 'Ende', title: 'Arbeit Bis', longTitle: 'Arbeitszeit Bis', type: 'time' },
        {
          name: 'zulagenAnzeigeN',
          title: 'Zulagen',
          longTitle: 'Zulagen',
          breakpoints: 'md',
          classes: ['cell-multiline'],
          parser: (value: unknown) => (typeof value === 'string' && value.length > 0 ? value : '-'),
        },
        {
          name: 'Auftragsnummer',
          title: 'Auftragsnummer',
          breakpoints: 'md',
          parser: (value: unknown) => {
            const s = value as string;
            return s ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '-';
          },
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

    const unbindButtons = bindClickHandlers([
      [
        'btnESN',
        () => {
          if (checkIfGreater2024(Jahr, true)) createAddModalNeben(ftN);
        },
      ],
      ['btnSaveN', btn => saveDaten(btn)],
      [
        'btnDownloadN',
        btn => {
          if (checkIfGreater2024(Jahr, true)) generatePDF(btn, 'N');
        },
      ],
      ['btnHelpNeben', () => openHelpModal('tab.neben')],
    ]);

    registerAutoSaveButton('btnSaveN', ['N']);

    const monat = Storage.get<number>('Monat', { default: dayjs().month() + 1 });
    ftN.rows.setFilter(
      row => getMonatFromN(row) === monat && checkIfGreater2024(Storage.get<number>('Jahr', { default: Jahr })),
    );

    return unbindButtons;
  }, []);

  return (
    <div className="container-lg text-center">
      <div className="row justify-content-center">
        <h1 className="d-inline-flex align-items-center justify-content-center gap-2">
          Nebenbezüge
          <button type="button" className="btn btn-sm btn-link p-0" id="btnHelpNeben" aria-label="Hilfe anzeigen">
            <span className="db-icon align-middle db-font-size-md" data-icon="question_mark_circle" />
          </button>
        </h1>
        <h4 id="MonatN"></h4>
      </div>

      <div className="container">
        <div className="row row-cols-1 row-cols-md-3 justify-content-center justify-content-sm-start justify-content-md-center g-3 my-3 w200">
          <div className="col d-grid">
            <button type="button" className="btn btn-primary" id="btnESN" data-disabler>
              <span className="db-icon" data-icon="plus" />
              Hinzufügen
            </button>
          </div>
          <div className="col d-grid">
            <button className="btn btn-success" type="button" id="btnSaveN" data-disabler>
              <span className="db-icon" data-icon="save" />
              Speichern
            </button>
          </div>
          <div className="col d-grid">
            <button className="btn btn-secondary" type="button" id="btnDownloadN" data-disabler>
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
        <table id="tableN" className="align-middle" aria-label="Nebengeld"></table>
      </div>
    </div>
  );
}

export function mountNebenTab(): void {
  const container = document.querySelector<HTMLDivElement>('#neben-root');
  if (!container) return;

  mount(container, <NebenTab />);
}

export function unmountNebenTab(): void {
  const container = document.querySelector<HTMLDivElement>('#neben-root');
  if (!container) return;

  unmount(container);
}
