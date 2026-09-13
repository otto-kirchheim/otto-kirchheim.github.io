import { DBButton, DBTooltip } from '@db-ux/react-core-components';
import { useEffect } from 'react';
import { mount, unmount } from '@/infrastructure/ui';

import { DBLoadingButton } from '@/components';
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

    const dateParser = (value: unknown) => {
      const d = dayjs(value as string, 'DD.MM.YYYY');
      return d.format('DD.MM.YY');
    };

    const ftN = createCustomTable('tableN', {
      columns: [
        {
          name: 'Tag',
          title: 'Tag',
          sortable: true,
          sorted: true,
          direction: 'ASC',
          parser: dateParser,
        },
        { name: 'Beginn', title: 'Arbeit Von', longTitle: 'Arbeitszeit Von', type: 'time' },
        { name: 'Ende', title: 'Arbeit Bis', longTitle: 'Arbeitszeit Bis', type: 'time' },
        {
          name: 'zulagenAnzeigeN',
          title: 'Zulagen',
          longTitle: 'Zulagen',
          breakpoints: 'sm',
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
    <div className="mitte text-center">
      <div className="raster justify-content-center">
        <h1 className="d-inline-flex align-items-center justify-content-center gap-2">
          Nebenbezüge
          <DBButton
            type="button"
            className="p-0"
            variant="ghost"
            size="small"
            id="btnHelpNeben"
            icon="question_mark_circle"
            noText
            aria-label="Hilfe anzeigen"
          >
            <DBTooltip>Hilfe anzeigen</DBTooltip>
          </DBButton>
        </h1>
        <h4 id="MonatN"></h4>
      </div>

      <div className="mitte">
        <div className="raster-auto my-3 knopfreihe abstand-3">
          <div className="d-grid">
            <DBButton type="button" variant="brand" icon="plus" id="btnESN" data-disabler>
              Hinzufügen
            </DBButton>
          </div>
          <div className="d-grid">
            <DBLoadingButton
              type="button"
              variant="filled"
              data-color="successful"
              icon="save"
              id="btnSaveN"
              data-disabler
            >
              Speichern
            </DBLoadingButton>
          </div>
          <div className="d-grid">
            <DBLoadingButton type="button" variant="filled" icon="download" id="btnDownloadN" data-disabler>
              PDF erzeugen
            </DBLoadingButton>
          </div>
        </div>
      </div>
      <hr />

      <div className="db-table" data-width="full" data-variant="zebra" data-divider="both" data-size="small">
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
