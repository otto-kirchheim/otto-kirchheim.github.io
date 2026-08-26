import { render } from 'preact';
import { useEffect } from 'preact/hooks';
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

    // "click"-Eventlistener
    const btnESZ = document.querySelector<HTMLButtonElement>('#btnESZ');
    const btnESE = document.querySelector<HTMLButtonElement>('#btnESE');
    const btnSaveB = document.querySelector<HTMLButtonElement>('#btnSaveB');
    const btnDownloadB = document.querySelector<HTMLButtonElement>('#btnDownloadB');
    const btnHelpBereitschaft = document.querySelector<HTMLButtonElement>('#btnHelpBereitschaft');

    const onClickSaveB = () => {
      saveDaten(btnSaveB);
    };
    const onClickDownloadB = () => {
      generatePDF(btnDownloadB, 'B');
    };
    const onClickHelpBereitschaft = () => openHelpModal('tab.bereitschaft');

    btnESZ?.addEventListener('click', createAddModalBereitschaftsZeit);
    btnESE?.addEventListener('click', createAddModalBereitschaftsEinsatz);
    btnSaveB?.addEventListener('click', onClickSaveB);
    btnDownloadB?.addEventListener('click', onClickDownloadB);
    btnHelpBereitschaft?.addEventListener('click', onClickHelpBereitschaft);

    registerAutoSaveButton('btnSaveB', ['BZ', 'BE']);

    const monat = Storage.get<number>('Monat', { default: dayjs().month() + 1 });
    ftBZ.rows.setFilter(row => getMonatFromBZ(row) === monat);
    ftBE.rows.setFilter(row => getMonatFromBE(row) === monat);

    return () => {
      btnESZ?.removeEventListener('click', createAddModalBereitschaftsZeit);
      btnESE?.removeEventListener('click', createAddModalBereitschaftsEinsatz);
      btnSaveB?.removeEventListener('click', onClickSaveB);
      btnDownloadB?.removeEventListener('click', onClickDownloadB);
      btnHelpBereitschaft?.removeEventListener('click', onClickHelpBereitschaft);
    };
  }, []);

  return (
    <div class="container text-center">
      <div class="row justify-content-center">
        <h1 class="d-inline-flex align-items-center justify-content-center gap-2">
          Bereitschaft
          <button type="button" class="btn btn-sm btn-link p-0" id="btnHelpBereitschaft" aria-label="Hilfe anzeigen">
            <span class="material-icons-round align-middle" style="font-size: 1.25rem">
              help_outline
            </span>
          </button>
        </h1>
        <h4 id="MonatB"></h4>
      </div>

      <div class="container">
        <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-4 justify-content-center g-3 my-3 w200">
          <div class="col d-grid">
            <button type="button" class="btn btn-primary" id="btnESZ" data-disabler>
              <span class="material-icons-round big-icons">add_circle_outlined</span>
              Bereitschaft
            </button>
          </div>
          <div class="col d-grid">
            <button type="button" class="btn btn-primary" id="btnESE" data-disabler>
              <span class="material-icons-round big-icons">add_circle_outlined</span>
              Einsatz
            </button>
          </div>
          <div class="col d-grid">
            <button type="button" class="btn btn-success" id="btnSaveB" data-disabler>
              <span class="material-icons-round big-icons">save</span>
              Speichern
            </button>
          </div>
          <div class="col d-grid">
            <button type="button" class="btn btn-secondary" id="btnDownloadB" data-disabler>
              <span class="material-icons-round big-icons">download</span>
              PDF erzeugen
            </button>
          </div>
        </div>
      </div>
      <hr />
      <div class="table-responsive">
        <h4 id="titelBZ">Bereitschaftszeitraum</h4>
        <table
          id="tableBZ"
          class="table table-bordered table-striped table-hover align-middle"
          aria-describedby="TitelBZ"
        ></table>
      </div>
      <hr />
      <div class="table-responsive">
        <h4 id="titelBE">Bereitschaftseinsätze</h4>
        <table
          id="tableBE"
          class="table table-bordered table-striped table-hover align-middle"
          aria-describedby="titelBE"
        ></table>
      </div>
    </div>
  );
}

export function mountBereitschaftTab(): void {
  const container = document.querySelector<HTMLDivElement>('#bereitschaft-root');
  if (!container) return;

  render(<BereitschaftTab />, container);
}

export function unmountBereitschaftTab(): void {
  const container = document.querySelector<HTMLDivElement>('#bereitschaft-root');
  if (!container) return;

  render(null, container);
}
