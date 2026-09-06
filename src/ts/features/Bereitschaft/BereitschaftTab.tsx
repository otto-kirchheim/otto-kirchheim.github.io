import { useEffect } from 'react';
import { mount, unmount } from '@/infrastructure/ui';

import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import type { CustomTable } from '@/infrastructure/table/CustomTable';
import { createCustomTable } from '@/infrastructure/table/CustomTable';
import { openHelpModal } from '@/core';
import type { IDatenBE, IDatenBZ } from '@/types';
import { confirmDeleteAllRows } from '@/infrastructure/data/confirmDeleteAllRows';
import { createOnChangeHandler } from '@/infrastructure/autoSave/autoSave';
import { getMonatFromBE, getMonatFromBZ } from '@/infrastructure/date/getMonatFromItem';
import { default as saveDaten } from '@/infrastructure/data/saveDaten';
import { registerAutoSaveButton } from '@/infrastructure/autoSave/autoSaveIndicator';
import { bindClickHandlers } from '@/infrastructure/ui/bindClickHandlers';
import Storage from '@/infrastructure/storage/Storage';
import dayjs from '@/infrastructure/date/configDayjs';
import generatePDF from '@/infrastructure/data/generatePDF';
import {
  EditorModalBE,
  EditorModalBereitschaftsZeit,
  ShowModalBereitschaft,
  createAddModalBereitschaftsEinsatz,
  createAddModalBereitschaftsZeit,
} from './components';
import {
  getBereitschaftsEinsatzDaten,
  getBereitschaftsZeitraumDaten,
  persistBereitschaftsEinsatzTableData,
  persistBereitschaftsZeitraumTableData,
} from './utils';

function BereitschaftTab() {
  useEffect(() => {
    const isEinsatzLinkedToZeitraum = (einsatz: IDatenBE, zeitraum: IDatenBZ): boolean => {
      const einsatzDate = dayjs(einsatz.Tag, 'DD.MM.YYYY').format('YYYY-MM-DD');
      const einsatzStart = dayjs(`${einsatzDate}T${einsatz.Beginn}`);
      const einsatzEndRaw = dayjs(`${einsatzDate}T${einsatz.Ende}`);
      const einsatzEnd = einsatzEndRaw.isAfter(einsatzStart) ? einsatzEndRaw : einsatzEndRaw.add(1, 'day');
      const bzStart = dayjs(String(zeitraum.Beginn));
      const bzEnd = dayjs(String(zeitraum.Ende));

      // Überlappung: BE-Zeitfenster überlappt mit BZ-Zeitfenster
      return einsatzStart.isBefore(bzEnd) && einsatzEnd.isAfter(bzStart);
    };

    const countLinkedEinsaetze = (zeitraum: IDatenBZ): number => {
      return getBereitschaftsEinsatzDaten(undefined, undefined, { scope: 'all', excludeDeleted: true }).filter(
        einsatz => isEinsatzLinkedToZeitraum(einsatz, zeitraum),
      ).length;
    };

    const datetimeParser = (value: unknown): string => dayjs(value as string).format('DD.MM.YYYY, LT'),
      timeZeroParser = (value: unknown): number | string => (!value ? '' : (value as number)),
      ftBZ: CustomTable<IDatenBZ> = createCustomTable<IDatenBZ>('tableBZ', {
        columns: [
          {
            name: 'Beginn',
            title: 'Von',
            parser: datetimeParser,
            sortable: true,
            sorted: true,
            direction: 'ASC',
            type: 'DateTime',
          },
          { name: 'Ende', title: 'Bis', parser: datetimeParser, sortable: true, type: 'DateTime' },
          { name: 'Pause', title: 'Pause', parser: timeZeroParser, breakpoints: 'xs', type: 'number' },
        ],
        rows: getBereitschaftsZeitraumDaten(undefined, undefined, { scope: 'all' }),
        sorting: { enabled: true },
        onChange: createOnChangeHandler('BZ'),
        editing: {
          enabled: true,
          addRow: () => {
            EditorModalBereitschaftsZeit(ftBZ, 'Zeitraum hinzufügen');
          },
          editRow: row => {
            EditorModalBereitschaftsZeit(row, 'Zeitraum bearbeiten');
          },
          showRow: row => {
            ShowModalBereitschaft(row, 'Zeitraum anzeigen');
          },
          deleteRow: row => {
            const bzToDelete = row.cells as IDatenBZ;
            const beImZeitraum = getBereitschaftsEinsatzDaten(undefined, undefined, {
              scope: 'all',
              excludeDeleted: true,
            }).some(einsatz => isEinsatzLinkedToZeitraum(einsatz, bzToDelete));
            if (beImZeitraum) {
              createSnackBar({
                message:
                  'Bereitschaftszeitraum kann nicht gelöscht werden, da mindestens ein Bereitschaftseinsatz in diesem Zeitraum liegt.',
                status: 'warning',
                timeout: 5000,
                fixed: true,
              });
              return;
            }
            row.deleteRow();
            persistBereitschaftsZeitraumTableData(ftBZ);
          },
          deleteAllRows: () => {
            const hasLinked = getBereitschaftsZeitraumDaten().some(zeitraum => countLinkedEinsaetze(zeitraum) > 0);
            if (hasLinked) {
              createSnackBar({
                message:
                  'Bereitschaft<br/>Es existieren Bereitschaftseinsätze mit Zuordnung zu Zeiträumen. Bitte zuerst die Einsätze löschen oder umhängen.',
                status: 'warning',
                timeout: 5000,
                fixed: true,
              });
              return;
            }

            confirmDeleteAllRows({
              table: ftBZ,
              rowFilter: (cells, m) => getMonatFromBZ(cells) === m,
              persist: persistBereitschaftsZeitraumTableData,
            });
          },
        },
      });

    // ----------------------------- Bereitschaftseinsätze ------------------------------------------------

    const ftBE: CustomTable<IDatenBE> = createCustomTable<IDatenBE>('tableBE', {
      columns: [
        { name: 'Tag', title: 'Datum', sortable: true, sorted: true, direction: 'ASC', type: 'Date' },
        {
          name: 'Auftragsnummer',
          title: 'Auftrags-Nr.',
          longTitle: 'SAP-Nr / Einsatzbeschreibung',
          sortable: true,
          classes: ['custom-text-truncate'],
          type: 'text',
        },
        { name: 'Beginn', title: 'Von', sortable: true, breakpoints: 'sm', type: 'time' },
        { name: 'Ende', title: 'Bis', sortable: true, breakpoints: 'sm', type: 'time' },
        { name: 'LRE', title: 'LRE', sortable: true },
        {
          name: 'PrivatKm',
          title: 'Privat Km',
          longTitle: 'Kilometer Privatfahrzeug',
          parser: timeZeroParser,
          breakpoints: 'md',
          type: 'number',
        },
      ],
      rows: getBereitschaftsEinsatzDaten(undefined, undefined, { scope: 'all' }),
      sorting: { enabled: true },
      onChange: createOnChangeHandler('BE'),
      editing: {
        enabled: true,
        addRow: () => {
          EditorModalBE(ftBE, 'Einsatz hinzufügen');
        },
        editRow: row => {
          EditorModalBE(row, 'Einsatz bearbeiten');
        },
        showRow: row => {
          ShowModalBereitschaft(row, 'Einsatz anzeigen');
        },
        deleteRow: row => {
          row.deleteRow();
          persistBereitschaftsEinsatzTableData(ftBE);
        },
        deleteAllRows: () => {
          confirmDeleteAllRows({
            table: ftBE,
            rowFilter: (cells, m) => getMonatFromBE(cells) === m,
            persist: persistBereitschaftsEinsatzTableData,
          });
        },
      },
    });

    const unbindButtons = bindClickHandlers([
      ['btnESZ', createAddModalBereitschaftsZeit],
      ['btnESE', createAddModalBereitschaftsEinsatz],
      ['btnSaveB', btn => saveDaten(btn)],
      ['btnDownloadB', btn => generatePDF(btn, 'B')],
      ['btnHelpBereitschaft', () => openHelpModal('tab.bereitschaft')],
    ]);

    registerAutoSaveButton('btnSaveB', ['BZ', 'BE']);

    const monat = Storage.get<number>('Monat', { default: dayjs().month() + 1 });
    ftBZ.rows.setFilter(row => getMonatFromBZ(row) === monat);
    ftBE.rows.setFilter(row => getMonatFromBE(row) === monat);

    return unbindButtons;
  }, []);

  return (
    <div className="container text-center">
      <div className="row justify-content-center">
        <h1 className="d-inline-flex align-items-center justify-content-center gap-2">
          Bereitschaft
          <button
            type="button"
            className="btn btn-sm btn-link p-0"
            id="btnHelpBereitschaft"
            aria-label="Hilfe anzeigen"
          >
            <span className="db-icon align-middle db-font-size-md" data-icon="question_mark_circle" />
          </button>
        </h1>
        <h4 id="MonatB"></h4>
      </div>

      <div className="container">
        <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-4 justify-content-center g-3 my-3 w200">
          <div className="col d-grid">
            <button type="button" className="btn btn-primary" id="btnESZ" data-disabler>
              <span className="db-icon" data-icon="plus" />
              Bereitschaft
            </button>
          </div>
          <div className="col d-grid">
            <button type="button" className="btn btn-primary" id="btnESE" data-disabler>
              <span className="db-icon" data-icon="plus" />
              Einsatz
            </button>
          </div>
          <div className="col d-grid">
            <button type="button" className="btn btn-success" id="btnSaveB" data-disabler>
              <span className="db-icon" data-icon="save" />
              Speichern
            </button>
          </div>
          <div className="col d-grid">
            <button type="button" className="btn btn-secondary" id="btnDownloadB" data-disabler>
              <span className="db-icon" data-icon="download" />
              PDF erzeugen
            </button>
          </div>
        </div>
      </div>
      <hr />
      <h4 id="titelBZ">Bereitschaftszeitraum</h4>
      <div
        className="db-table table-responsive"
        data-width="full"
        data-variant="zebra"
        data-divider="both"
        data-size="small"
      >
        <table id="tableBZ" className="align-middle" aria-describedby="TitelBZ"></table>
      </div>
      <hr />
      <h4 id="titelBE">Bereitschaftseinsätze</h4>
      <div
        className="db-table table-responsive"
        data-width="full"
        data-variant="zebra"
        data-divider="both"
        data-size="small"
      >
        <table id="tableBE" className="align-middle" aria-describedby="titelBE"></table>
      </div>
    </div>
  );
}

export function mountBereitschaftTab(): void {
  const container = document.querySelector<HTMLDivElement>('#bereitschaft-root');
  if (!container) return;

  mount(container, <BereitschaftTab />);
}

export function unmountBereitschaftTab(): void {
  const container = document.querySelector<HTMLDivElement>('#bereitschaft-root');
  if (!container) return;

  unmount(container);
}
