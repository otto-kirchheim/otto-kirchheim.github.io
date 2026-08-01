import { render } from 'preact';
import { useEffect } from 'preact/hooks';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { createCustomTable } from '@/infrastructure/table/CustomTable';
import { openHelpModal } from '@/core';
import { confirmDeleteAllRows } from '@/infrastructure/data/confirmDeleteAllRows';
import { getMonatFromN } from '@/infrastructure/date/getMonatFromItem';
import Storage from '@/infrastructure/storage/Storage';
import { createOnChangeHandler } from '@/infrastructure/autoSave/autoSave';
import { default as saveDaten } from '@/infrastructure/data/saveDaten';
import { registerAutoSaveButton } from '@/infrastructure/autoSave/autoSaveIndicator';
import dayjs from '@/infrastructure/date/configDayjs';
import download from '@/infrastructure/data/download';
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
          parser: (value: unknown) =>
            typeof value === 'string' && value.length > 0 ? value.replace(/\n/g, '<br>') : '-',
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

    const btnESN = document.querySelector<HTMLButtonElement>('#btnESN');
    const onClickESN = () => {
      if (checkIfGreater2024(Jahr, true)) createAddModalNeben(ftN);
    };
    btnESN?.addEventListener('click', onClickESN);

    const btnSaveN = document.querySelector<HTMLButtonElement>('#btnSaveN');
    const onClickSaveN = () => {
      saveDaten(btnSaveN);
    };
    btnSaveN?.addEventListener('click', onClickSaveN);

    const btnDownloadN = document.querySelector<HTMLButtonElement>('#btnDownloadN');
    const onClickDownloadN = () => {
      if (checkIfGreater2024(Jahr, true)) download(btnDownloadN, 'N');
    };
    btnDownloadN?.addEventListener('click', onClickDownloadN);

    const btnHelpNeben = document.querySelector<HTMLButtonElement>('#btnHelpNeben');
    const onClickHelpNeben = () => openHelpModal('tab.neben');
    btnHelpNeben?.addEventListener('click', onClickHelpNeben);

    registerAutoSaveButton('btnSaveN', ['N']);

    const monat = Storage.get<number>('Monat', { default: dayjs().month() + 1 });
    ftN.rows.setFilter(
      row => getMonatFromN(row) === monat && checkIfGreater2024(Storage.get<number>('Jahr', { default: Jahr })),
    );

    return () => {
      btnESN?.removeEventListener('click', onClickESN);
      btnSaveN?.removeEventListener('click', onClickSaveN);
      btnDownloadN?.removeEventListener('click', onClickDownloadN);
      btnHelpNeben?.removeEventListener('click', onClickHelpNeben);
    };
  }, []);

  return (
    <div class="container-lg text-center">
      <div class="row justify-content-center">
        <h1 class="d-inline-flex align-items-center justify-content-center gap-2">
          Nebenbezüge
          <button type="button" class="btn btn-sm btn-link p-0" id="btnHelpNeben" aria-label="Hilfe anzeigen">
            <span class="material-icons-round align-middle" style="font-size: 1.25rem">
              help_outline
            </span>
          </button>
        </h1>
        <h4 id="MonatN"></h4>
      </div>

      <div class="container">
        <div class="row row-cols-1 row-cols-md-3 justify-content-center justify-content-sm-start justify-content-md-center g-3 my-3 w200">
          <div class="col d-grid">
            <button type="button" class="btn btn-primary" id="btnESN" data-disabler>
              <span class="material-icons-round big-icons">add_circle_outlined</span>
              Hinzufügen
            </button>
          </div>
          <div class="col d-grid">
            <button class="btn btn-success" type="button" id="btnSaveN" data-disabler>
              <span class="material-icons-round big-icons">save</span>
              Speichern
            </button>
          </div>
          <div class="col d-grid">
            <button class="btn btn-secondary" type="button" id="btnDownloadN" data-disabler>
              <span class="material-icons-round big-icons">download</span>
              Herunterladen (PDF)
            </button>
          </div>
        </div>
      </div>
      <hr />

      <div class="table-responsive">
        <table id="tableN" class="table table-bordered table-striped table-hover align-middle" aria-label="Nebengeld"></table>
      </div>
    </div>
  );
}

export function mountNebenTab(): void {
  const container = document.querySelector<HTMLDivElement>('#neben-root');
  if (!container) return;

  render(<NebenTab />, container);
}

export function unmountNebenTab(): void {
  const container = document.querySelector<HTMLDivElement>('#neben-root');
  if (!container) return;

  render(null, container);
}
