import { useEffect } from 'react';
import { mount, unmount } from '@/infrastructure/ui';

import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { createCustomTable } from '@/infrastructure/table/CustomTable';
import { openHelpModal } from '@/core';
import { confirmDeleteAllRows } from '@/infrastructure/data/confirmDeleteAllRows';
import { getMonatFromEA } from '@/infrastructure/date/getMonatFromItem';
import Storage from '@/infrastructure/storage/Storage';
import { createOnChangeHandler } from '@/infrastructure/autoSave/autoSave';
import { default as saveDaten } from '@/infrastructure/data/saveDaten';
import { registerAutoSaveButton } from '@/infrastructure/autoSave/autoSaveIndicator';
import { bindClickHandlers } from '@/infrastructure/ui/bindClickHandlers';
import dayjs from '@/infrastructure/date/configDayjs';
import generatePDF from '@/infrastructure/data/generatePDF';
import { EditorModalEA, ShowModalEA, createAddModalEA } from './components';
import { getEaDaten, persistEaTableData } from './utils';

function EaTab() {
  useEffect(() => {
    const Jahr: number = Storage.get('Jahr', { default: dayjs().year() });

    const checkIfGreater2025 = (Jahr: number, showError?: boolean) => {
      const checked: boolean = Jahr >= 2025;
      if (!checked && showError)
        createSnackBar({
          message: 'Sorry, vor 2025 gibt es keinen Entgeltausgleich...',
          icon: '!',
          status: 'error',
        });

      return checked;
    };

    const getEmptyText = (Jahr: number) => (checkIfGreater2025(Jahr) ? 'Keine Daten gefunden' : 'Neu ab 2025');

    const ftEA = createCustomTable('tableEA', {
      columns: [
        { name: 'Tag', title: 'Tag', sortable: true, sorted: true, direction: 'ASC' },
        { name: 'Dauer', title: 'Dauer', longTitle: 'Dauer', type: 'time' },
        { name: 'Taetigkeit', title: 'Tätigkeit', longTitle: 'Tätigkeit', breakpoints: 'md' },
        { name: 'Entgeltgruppe', title: 'Entgeltgruppe', longTitle: 'Entgeltgruppe', breakpoints: 'md' },
      ],
      empty: () => getEmptyText(Jahr),
      rows: getEaDaten(undefined, undefined, { scope: 'all' }),
      sorting: { enabled: true },
      onChange: createOnChangeHandler('EA'),
      editing: {
        enabled: true,
        addRow: () => {
          if (checkIfGreater2025(Jahr, true)) createAddModalEA(ftEA);
        },
        editRow: row => {
          EditorModalEA(row, 'Entgeltausgleich bearbeiten');
        },
        showRow: row => {
          ShowModalEA(row, 'Entgeltausgleich anzeigen');
        },
        deleteRow: row => {
          row.deleteRow();
          persistEaTableData(ftEA);
        },
        deleteAllRows: () => {
          confirmDeleteAllRows({
            table: ftEA,
            rowFilter: (cells, m) => getMonatFromEA(cells) === m,
            persist: persistEaTableData,
          });
        },
      },
    });

    const unbindButtons = bindClickHandlers([
      [
        'btnESEA',
        () => {
          if (checkIfGreater2025(Jahr, true)) createAddModalEA(ftEA);
        },
      ],
      ['btnSaveEA', btn => saveDaten(btn)],
      [
        'btnDownloadEA',
        btn => {
          if (checkIfGreater2025(Jahr, true)) generatePDF(btn, 'EA');
        },
      ],
      ['btnHelpEA', () => openHelpModal('tab.ea')],
    ]);

    registerAutoSaveButton('btnSaveEA', ['EA']);

    const monat = Storage.get<number>('Monat', { default: dayjs().month() + 1 });
    ftEA.rows.setFilter(
      row => getMonatFromEA(row) === monat && checkIfGreater2025(Storage.get<number>('Jahr', { default: Jahr })),
    );

    return unbindButtons;
  }, []);

  return (
    <div className="container-lg text-center">
      <div className="row justify-content-center">
        <h1 className="d-inline-flex align-items-center justify-content-center gap-2">
          Entgeltausgleich
          <button type="button" className="btn btn-sm btn-link p-0" id="btnHelpEA" aria-label="Hilfe anzeigen">
            <span className="db-icon align-middle db-font-size-md" data-icon="question_mark_circle" />
          </button>
        </h1>
        <h4 id="MonatEA"></h4>
      </div>

      <div className="container">
        <div className="row row-cols-1 row-cols-md-3 justify-content-center justify-content-sm-start justify-content-md-center g-3 my-3 w200">
          <div className="col d-grid">
            <button type="button" className="btn btn-primary" id="btnESEA" data-disabler>
              <span className="db-icon" data-icon="plus" />
              Hinzufügen
            </button>
          </div>
          <div className="col d-grid">
            <button className="btn btn-success" type="button" id="btnSaveEA" data-disabler>
              <span className="db-icon" data-icon="save" />
              Speichern
            </button>
          </div>
          <div className="col d-grid">
            <button className="btn btn-secondary" type="button" id="btnDownloadEA" data-disabler>
              <span className="db-icon" data-icon="download" />
              PDF erzeugen
            </button>
          </div>
        </div>
      </div>
      <hr />

      <div className="table-responsive">
        <table
          id="tableEA"
          className="table table-bordered table-striped table-hover align-middle"
          aria-label="Entgeltausgleich"
        ></table>
      </div>
    </div>
  );
}

export function mountEaTab(): void {
  const container = document.querySelector<HTMLDivElement>('#ea-root');
  if (!container) return;

  mount(container, <EaTab />);
}

export function unmountEaTab(): void {
  const container = document.querySelector<HTMLDivElement>('#ea-root');
  if (!container) return;

  unmount(container);
}
