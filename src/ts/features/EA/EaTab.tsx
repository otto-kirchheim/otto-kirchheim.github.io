import { render } from 'preact';
import { useEffect } from 'preact/hooks';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { createCustomTable } from '@/infrastructure/table/CustomTable';
import { openHelpModal } from '@/core';
import { confirmDeleteAllRows } from '@/infrastructure/data/confirmDeleteAllRows';
import { getMonatFromEA } from '@/infrastructure/date/getMonatFromItem';
import Storage from '@/infrastructure/storage/Storage';
import { createOnChangeHandler } from '@/infrastructure/autoSave/autoSave';
import { default as saveDaten } from '@/infrastructure/data/saveDaten';
import { registerAutoSaveButton } from '@/infrastructure/autoSave/autoSaveIndicator';
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

    const btnESEA = document.querySelector<HTMLButtonElement>('#btnESEA');
    const onClickESEA = () => {
      if (checkIfGreater2025(Jahr, true)) createAddModalEA(ftEA);
    };
    btnESEA?.addEventListener('click', onClickESEA);

    const btnSaveEA = document.querySelector<HTMLButtonElement>('#btnSaveEA');
    const onClickSaveEA = () => {
      saveDaten(btnSaveEA);
    };
    btnSaveEA?.addEventListener('click', onClickSaveEA);

    const btnDownloadEA = document.querySelector<HTMLButtonElement>('#btnDownloadEA');
    const onClickDownloadEA = () => {
      if (checkIfGreater2025(Jahr, true)) generatePDF(btnDownloadEA, 'EA');
    };
    btnDownloadEA?.addEventListener('click', onClickDownloadEA);

    const btnHelpEA = document.querySelector<HTMLButtonElement>('#btnHelpEA');
    const onClickHelpEA = () => openHelpModal('tab.ea');
    btnHelpEA?.addEventListener('click', onClickHelpEA);

    registerAutoSaveButton('btnSaveEA', ['EA']);

    const monat = Storage.get<number>('Monat', { default: dayjs().month() + 1 });
    ftEA.rows.setFilter(
      row => getMonatFromEA(row) === monat && checkIfGreater2025(Storage.get<number>('Jahr', { default: Jahr })),
    );

    return () => {
      btnESEA?.removeEventListener('click', onClickESEA);
      btnSaveEA?.removeEventListener('click', onClickSaveEA);
      btnDownloadEA?.removeEventListener('click', onClickDownloadEA);
      btnHelpEA?.removeEventListener('click', onClickHelpEA);
    };
  }, []);

  return (
    <div class="container-lg text-center">
      <div class="row justify-content-center">
        <h1 class="d-inline-flex align-items-center justify-content-center gap-2">
          Entgeltausgleich
          <button type="button" class="btn btn-sm btn-link p-0" id="btnHelpEA" aria-label="Hilfe anzeigen">
            <span class="material-icons-round align-middle" style="font-size: 1.25rem">
              help_outline
            </span>
          </button>
        </h1>
        <h4 id="MonatEA"></h4>
      </div>

      <div class="container">
        <div class="row row-cols-1 row-cols-md-3 justify-content-center justify-content-sm-start justify-content-md-center g-3 my-3 w200">
          <div class="col d-grid">
            <button type="button" class="btn btn-primary" id="btnESEA" data-disabler>
              <span class="material-icons-round big-icons">add_circle_outlined</span>
              Hinzufügen
            </button>
          </div>
          <div class="col d-grid">
            <button class="btn btn-success" type="button" id="btnSaveEA" data-disabler>
              <span class="material-icons-round big-icons">save</span>
              Speichern
            </button>
          </div>
          <div class="col d-grid">
            <button class="btn btn-secondary" type="button" id="btnDownloadEA" data-disabler>
              <span class="material-icons-round big-icons">download</span>
              PDF erzeugen
            </button>
          </div>
        </div>
      </div>
      <hr />

      <div class="table-responsive">
        <table
          id="tableEA"
          class="table table-bordered table-striped table-hover align-middle"
          aria-label="Entgeltausgleich"
        ></table>
      </div>
    </div>
  );
}

export function mountEaTab(): void {
  const container = document.querySelector<HTMLDivElement>('#ea-root');
  if (!container) return;

  render(<EaTab />, container);
}

export function unmountEaTab(): void {
  const container = document.querySelector<HTMLDivElement>('#ea-root');
  if (!container) return;

  render(null, container);
}
