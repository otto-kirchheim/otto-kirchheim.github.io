import { DBButton, DBStack, DBTooltip } from '@db-ux/react-core-components';
import { useEffect } from 'react';

import { DBLoadingButton } from '@/components';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { asAnyTable, useCustomTableState } from '@/infrastructure/table/CustomTable';
import CustomTableView from '@/infrastructure/table/CustomTableView';
import { openHelpModal } from '@/core';
import type { CustomHTMLTableElement, IDatenEWT, IVorgabenU } from '@/types';
import { default as buttonDisable } from '@/infrastructure/ui/buttonDisable';
import { confirmDeleteAllRows } from '@/infrastructure/data/confirmDeleteAllRows';
import { isEwtInMonat } from '@/infrastructure/date/getMonatFromItem';
import Storage from '@/infrastructure/storage/Storage';
import { createOnChangeHandler } from '@/infrastructure/autoSave/autoSave';
import { default as saveDaten } from '@/infrastructure/data/saveDaten';
import { bindClickHandlers } from '@/infrastructure/ui/bindClickHandlers';
import dayjs from '@/infrastructure/date/configDayjs';
import { EditorModalEWT, ShowModalEWT, createAddModalEWT } from './components';
import generatePDF from '@/infrastructure/data/generatePDF';
import { attachBerechnenToggleListeners, recalculateEwtMonat, getEwtDaten, persistEwtTableData } from './utils';

export function EwtTab() {
  // Nur beim allerersten Aufruf gelesen (siehe `useCustomTableState()`s Docblock) -- exakt das
  // bisherige `useEffect(() => {...}, [])`-Verhalten.
  const tagParser = (value: unknown) => {
      const s = value as string;
      const d = dayjs(s, 'DD.MM.YYYY', true);
      return d.isValid() ? d.format('dd DD.MM.') : s;
    },
    // Beide Parser geben JSX zurueck (Boolean-Schalter bzw. Switch ueber feste Faelle) --
    // nur deshalb duerfen die Spalten `html: true` setzen (`CustomTableView.tsx` rendert den
    // Rueckgabewert dann direkt statt ihn zu `String()`en).
    berechnenParser = (value: unknown) => (
      // Unkontrolliert mit Absicht: `attachBerechnenToggleListeners` (unten) liest den
      // Klick-Zustand direkt vom DOM-Element, kein React-State noetig. Beschriftung steht
      // in der Spaltenueberschrift, deshalb nur ein `aria-label` am Feld.
      <div className="db-switch">
        <label>
          <input
            type="checkbox"
            role="switch"
            className="row-checkbox"
            aria-label="Berechnen"
            defaultChecked={Boolean(value)}
          />
        </label>
      </div>
    ),
    schichtParser = (value: unknown) => {
      switch (value as string) {
        case 'T':
          return 'Tag';
        case 'N':
          return 'Nacht';
        case 'SP':
          return 'Spät';
        case 'BN': //legacy: BN = Bereitschaft + Nacht
          return (
            <span className="SchichtBereitschaft">
              Bereitschaft
              <br />+ Nacht
            </span>
          );
        case 'S':
          return 'Sonder';
        default:
          return 'Unbekannt';
      }
    },
    ftE = useCustomTableState<IDatenEWT>('tableE', {
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
        {
          name: 'Schicht',
          title: 'Schicht',
          // `parser` ist auf `string | number` typisiert (gilt fuer alle anderen Spalten
          // dieser und aller anderen Tabellen); `html: true`-Spalten sind der dokumentierte
          // Ausnahmefall und geben tatsaechlich JSX zurueck, siehe `CustomTableView.tsx`.
          parser: schichtParser as unknown as (value: unknown) => string,
          type: 'time',
          html: true,
        },
        { name: 'abWE', title: 'Ab Wohnung', breakpoints: 'md', type: 'time' },
        { name: 'beginE', title: 'Arbeitszeit Von', breakpoints: 'sm', type: 'time' },
        { name: 'ab1E', title: 'Ab 1.Tgk.-St.', breakpoints: 'lg', type: 'time' },
        { name: 'anEE', title: 'An Einsatzort', breakpoints: 'lg', type: 'time' },
        { name: 'abEE', title: 'Ab Einsatzort', breakpoints: 'lg', type: 'time' },
        { name: 'an1E', title: 'An 1.Tgk.-St.', breakpoints: 'lg', type: 'time' },
        { name: 'endeE', title: 'Arbeitszeit Bis', breakpoints: 'sm', type: 'time' },
        { name: 'anWE', title: 'An Wohnung', breakpoints: 'md', type: 'time' },
        {
          name: 'berechnen',
          title: 'Berechnen?',
          parser: berechnenParser as unknown as (value: unknown) => string,
          breakpoints: 'lg',
          html: true,
        },
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
            look: { variant: 'filled' },
            text: 'Alle Zeiten entfernen',
            function: () => {
              createSnackBar({
                titel: 'Alle Zeiten entfernen?',
                message: 'Nur bei Zeilen, die auch berechnet werden.',
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
                  },
                  { text: 'Nein', dismiss: true },
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

  useEffect(() => {
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

    const monat = Storage.get<number>('Monat', { default: dayjs().month() + 1 });
    ftE.rows.setFilter(row => isEwtInMonat(row, monat));

    return unbindButtons;
    // Bewusst einmalig wie vorher -- `ftE` ist stabil (siehe `NebenTab.tsx`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mitte text-center">
      <div className="raster justify-content-center">
        <h1 className="d-inline-flex align-items-center justify-content-center gap-2">
          EWT
          <DBButton
            type="button"
            className="p-0"
            variant="ghost"
            size="small"
            id="btnHelpEWT"
            icon="question_mark_circle"
            noText
            aria-label="Hilfe anzeigen"
          >
            <DBTooltip>Hilfe anzeigen</DBTooltip>
          </DBButton>
        </h1>
        <h4 id="MonatE"></h4>
      </div>

      <div className="mitte">
        <DBStack direction="row" wrap justifyContent="center" gap="medium" className="my-3 knopfreihe">
          <DBButton type="button" variant="brand" icon="plus" id="btnESEE" data-disabler>
            Anwesenheit
          </DBButton>
          <DBButton type="button" variant="brand" icon="bar_chart" id="btnZb" data-disabler>
            Berechnen
          </DBButton>
          <DBLoadingButton
            type="button"
            variant="filled"
            data-color="successful"
            icon="save"
            id="btnSaveE"
            data-disabler
            autoSaveResources={['EWT']}
          >
            Speichern
          </DBLoadingButton>
          <DBLoadingButton type="button" variant="filled" icon="download" id="btnDownloadE" data-disabler>
            PDF erzeugen
          </DBLoadingButton>
        </DBStack>
      </div>
      <hr />

      <div className="db-table" data-width="full" data-variant="zebra" data-divider="both" data-size="small">
        <table
          id="tableE"
          className="align-middle"
          aria-label="EWT"
          ref={(el: HTMLTableElement | null) => {
            if (el) ftE.attachElement(el as CustomHTMLTableElement<IDatenEWT>);
          }}
        >
          <CustomTableView table={asAnyTable(ftE)} />
        </table>
      </div>
    </div>
  );
}
