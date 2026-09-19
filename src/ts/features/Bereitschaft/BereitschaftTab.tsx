import { DBButton, DBDivider, DBSection, DBStack, DBTooltip } from '@db-ux/react-core-components';
import { useEffect } from 'react';

import { DBLoadingButton } from '@/components';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import type { CustomTable } from '@/infrastructure/table/CustomTable';
import { asAnyTable, useCustomTableState } from '@/infrastructure/table/CustomTable';
import CustomTableView from '@/infrastructure/table/CustomTableView';
import { openHelpModal } from '@/core';
import type { CustomHTMLTableElement, IDatenBE, IDatenBZ } from '@/types';
import { confirmDeleteAllRows } from '@/infrastructure/data/confirmDeleteAllRows';
import { createOnChangeHandler } from '@/infrastructure/autoSave/autoSave';
import { getMonatFromBE, getMonatFromBZ } from '@/infrastructure/date/getMonatFromItem';
import { default as saveDaten } from '@/infrastructure/data/saveDaten';
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

export function BereitschaftTab() {
  // Nur beim allerersten Aufruf gelesen (siehe `useCustomTableState()`s Docblock) -- exakt das
  // bisherige `useEffect(() => {...}, [])`-Verhalten.
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
    return getBereitschaftsEinsatzDaten(undefined, undefined, { scope: 'all', excludeDeleted: true }).filter(einsatz =>
      isEinsatzLinkedToZeitraum(einsatz, zeitraum),
    ).length;
  };

  // Zwei Zeilen (Datum, Zeit) statt "DD.MM.YYYY, HH:mm" in einer -- schmaler, dadurch auf
  // schmalen Viewports (siehe `html: true`-Praezedenzfall in `EwtTab.tsx`s `schichtParser`)
  // eher ohne Tabellen-Ueberlauf lesbar.
  const datetimeParser = (value: unknown) => {
      const mediaQuery: MediaQueryList = window.matchMedia('(max-width: 768px)');
      const d = dayjs(value as string);
      if (!mediaQuery.matches) return d.isValid() ? d.format('dd DD.MM., LT') : (value as string);
      return (
        <span>
          {d.isValid() ? d.format('dd DD.MM.') : (value as string)}
          <br />
          {d.isValid() ? d.format('LT') : (value as string)}
        </span>
      );
    },
    timeZeroParser = (value: unknown): number | string => (!value ? '' : (value as number)),
    ftBZ: CustomTable<IDatenBZ> = useCustomTableState<IDatenBZ>('tableBZ', {
      columns: [
        {
          name: 'Beginn',
          title: 'Von',
          // `parser` ist auf `string | number` typisiert (siehe EwtTab.tsx), `html: true`
          // ist der dokumentierte Ausnahmefall fuer tatsaechlich JSX-lieferende Parser.
          parser: datetimeParser as unknown as (value: unknown) => string,
          html: true,
          sortable: true,
          sorted: true,
          direction: 'ASC',
          type: 'DateTime',
        },
        {
          name: 'Ende',
          title: 'Bis',
          parser: datetimeParser as unknown as (value: unknown) => string,
          html: true,
          sortable: true,
          type: 'DateTime',
        },
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

  const dateParser = (value: unknown) => {
      const d = dayjs(value as string, 'DD.MM.YYYY', true);
      return d.isValid() ? d.format('dd DD.MM.') : (value as string);
    },
    lreParser = (value: unknown) => {
      const s = value as string;
      if (!s) return '-';
      const match = s.match(/^LRE\s+(\d+(?:\/\d+)?)(?:\s+(ohne\s+x))?/);
      if (!match) return s;
      const [, num, ohneX] = match;
      const cleanNum = num.replace('/', '');
      return ohneX ? `${cleanNum}oX` : cleanNum;
    },
    ftBE: CustomTable<IDatenBE> = useCustomTableState<IDatenBE>('tableBE', {
      columns: [
        {
          name: 'Tag',
          title: 'Datum',
          sortable: true,
          sorted: true,
          direction: 'ASC',
          type: 'Date',
          parser: dateParser,
        },
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
        { name: 'LRE', title: 'LRE', sortable: true, parser: lreParser },
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

  useEffect(() => {
    const unbindButtons = bindClickHandlers([
      ['btnESZ', createAddModalBereitschaftsZeit],
      ['btnESE', createAddModalBereitschaftsEinsatz],
      ['btnSaveB', btn => saveDaten(btn)],
      ['btnDownloadB', btn => generatePDF(btn, 'B')],
      ['btnHelpBereitschaft', () => openHelpModal('tab.bereitschaft')],
    ]);

    const monat = Storage.get<number>('Monat', { default: dayjs().month() + 1 });
    ftBZ.rows.setFilter(row => getMonatFromBZ(row) === monat);
    ftBE.rows.setFilter(row => getMonatFromBE(row) === monat);

    return unbindButtons;
    // Bewusst einmalig wie vorher -- `ftBZ`/`ftBE` sind stabil (siehe `NebenTab.tsx`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DBSection width="large" spacing="none" className="text-center">
      <div className="raster justify-content-center">
        <h1 className="d-inline-flex align-items-center justify-content-center gap-2">
          Bereitschaft
          <DBButton
            type="button"
            className="p-0"
            variant="ghost"
            size="small"
            id="btnHelpBereitschaft"
            icon="question_mark_circle"
            noText
            aria-label="Hilfe anzeigen"
          >
            <DBTooltip>Hilfe anzeigen</DBTooltip>
          </DBButton>
        </h1>
        <h4 id="MonatB"></h4>
      </div>

      <div>
        <DBStack direction="row" wrap justifyContent="center" gap="medium" className="my-3 knopfreihe">
          <DBLoadingButton type="button" variant="brand" icon="plus" id="btnESZ" data-disabler>
            Bereitschaft
          </DBLoadingButton>
          <DBLoadingButton type="button" variant="brand" icon="plus" id="btnESE" data-disabler>
            Einsatz
          </DBLoadingButton>
          <DBLoadingButton
            type="button"
            variant="filled"
            data-color="successful"
            icon="save"
            id="btnSaveB"
            data-disabler
            autoSaveResources={['BZ', 'BE']}
          >
            Speichern
          </DBLoadingButton>
          <DBLoadingButton type="button" variant="filled" icon="download" id="btnDownloadB" data-disabler>
            PDF erzeugen
          </DBLoadingButton>
        </DBStack>
      </div>
      <DBDivider width="full" />
      <h4 id="titelBZ">Bereitschaftszeitraum</h4>
      <div className="db-table" data-width="full" data-variant="zebra" data-divider="both" data-size="small">
        <table
          id="tableBZ"
          className="align-middle"
          aria-describedby="TitelBZ"
          ref={(el: HTMLTableElement | null) => {
            if (el) ftBZ.attachElement(el as CustomHTMLTableElement<IDatenBZ>);
          }}
        >
          <CustomTableView table={asAnyTable(ftBZ)} />
        </table>
      </div>
      <DBDivider width="full" />
      <h4 id="titelBE">Bereitschaftseinsätze</h4>
      <div className="db-table" data-width="full" data-variant="zebra" data-divider="both" data-size="small">
        <table
          id="tableBE"
          className="align-middle"
          aria-describedby="titelBE"
          ref={(el: HTMLTableElement | null) => {
            if (el) ftBE.attachElement(el as CustomHTMLTableElement<IDatenBE>);
          }}
        >
          <CustomTableView table={asAnyTable(ftBE)} />
        </table>
      </div>
    </DBSection>
  );
}
