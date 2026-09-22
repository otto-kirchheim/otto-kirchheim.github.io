import { DBButton, DBDivider, DBHeadingH1, DBSection, DBStack, DBTooltip } from '@db-ux/react-core-components';
import { useEffect } from 'react';

import { DBLoadingButton } from '@/components';
import MonatUeberschrift from '@/infrastructure/ui/MonatUeberschrift';
import { createSnackBar } from '@/shared/ui/snackbar/CustomSnackbar';
import { asAnyTable, useCustomTableState } from '@/shared/ui/custom-table/CustomTable';
import CustomTableView from '@/shared/ui/custom-table/CustomTableView';
import { openHelpModal } from '@/core';
import type { CustomHTMLTableElement, IDatenEWT, IVorgabenU } from '@/types';
import { default as buttonDisable } from '@/shared/ui/button-loading/buttonDisable';
import { confirmDeleteAllRows } from '@/infrastructure/data/confirmDeleteAllRows';
import { isEwtInMonat } from '@/shared/lib/date/getMonatFromItem';
import Storage from '@/shared/lib/storage/Storage';
import { createOnChangeHandler } from '@/infrastructure/autoSave/autoSave';
import { default as saveDaten } from '@/infrastructure/data/saveDaten';
import { bindClickHandlers } from '@/shared/lib/dom/bindClickHandlers';
import dayjs from '@/shared/lib/date/configDayjs';
import { EditorModalEWT, ShowModalEWT, createAddModalEWT } from './components';
import generatePDF from '@/infrastructure/data/generatePDF';
import { attachBerechnenToggleListeners, recalculateEwtMonat, getEwtDaten, persistEwtTableData } from './utils';

/**
 * Tab "EWT": Tabelle der Anwesenheitseinträge des aktiven Monats mit Anwesenheit-, Berechnen-,
 * Speichern-, PDF- und Hilfe-Buttons sowie "Berechnen?"-Schalter je Zeile.
 */
export function EwtTab() {
  /**
   * Formatiert einen Tag-Zellwert für die Anzeige als `dd DD.MM.`.
   *
   * @param value - Tag als `YYYY-MM-DD`.
   * @returns Formatierter Tag; bei nicht parsbarem Wert der Originalstring.
   */
  const tagParser = (value: unknown) => {
      const s = value as string;
      const d = dayjs(s, 'YYYY-MM-DD', true);
      return d.isValid() ? d.format('dd DD.MM.') : s;
    },
    // `berechnenParser` und `schichtParser` geben JSX zurück; nur deshalb dürfen ihre Spalten
    // `html: true` setzen (`CustomTableView.tsx` rendert den Rückgabewert dann direkt).
    /**
     * Rendert den "Berechnen?"-Schalter einer Zeile.
     *
     * @param value - Zellwert `berechnen`; truthy = eingeschaltet.
     * @returns Switch-Element.
     */
    berechnenParser = (value: unknown) => (
      // Unkontrolliert mit Absicht: `attachBerechnenToggleListeners` liest den Klick-Zustand direkt
      // vom DOM-Element. Beschriftung steht in der Spaltenüberschrift, daher nur ein `aria-label`.
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
    /**
     * Wandelt das Schichtkürzel in den Anzeigetext um.
     *
     * @param value - Schichtkürzel `T`, `N`, `SP`, `BN` oder `S`.
     * @returns Anzeigetext bzw. JSX (BN); "Unbekannt" bei anderem Wert.
     */
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
    // Optionen werden nur beim ersten Aufruf gelesen (siehe Docblock von `useCustomTableState()`).
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
        { name: 'Buchungstag', title: 'Buchungs\n-Tag', breakpoints: 'lg', parser: tagParser },
        { name: 'Einsatzort', title: 'Einsatzort', classes: ['custom-text-truncate'], type: 'text' },
        {
          name: 'Schicht',
          title: 'Schicht',
          // `parser` ist auf `string | number` typisiert; `html: true`-Spalten sind der dokumentierte
          // Ausnahmefall und geben JSX zurück (siehe `CustomTableView.tsx`).
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
        /** Öffnet den Editor für eine neue Anwesenheit. */
        addRow: () => {
          EditorModalEWT(ftE, 'Anwesenheit hinzufügen');
        },
        /**
         * Öffnet den Editor für eine bestehende Anwesenheit.
         *
         * @param row - Zu bearbeitende Zeile.
         */
        editRow: row => {
          EditorModalEWT(row, 'Anwesenheit bearbeiten');
        },
        /**
         * Zeigt eine Anwesenheit schreibgeschützt an.
         *
         * @param row - Anzuzeigende Zeile.
         */
        showRow: row => {
          ShowModalEWT(row, 'Anwesenheit anzeigen');
        },
        /**
         * Löscht die Zeile und speichert die Tabelle.
         *
         * @param row - Zu löschende Zeile.
         */
        deleteRow: row => {
          row.deleteRow();
          persistEwtTableData(ftE);
        },
        /** Löscht nach Rückfrage alle Zeilen des aktiven Monats. */
        deleteAllRows: () => {
          confirmDeleteAllRows({
            table: ftE,
            /**
             * Zeile zählt zum Monat, wenn Tag oder Buchungstag darin liegen.
             *
             * @param cells - Zeilenwerte.
             * @param m - Monat (1-12).
             * @returns `true`, wenn die Zeile gelöscht werden soll.
             */
            rowFilter: (cells, m) => isEwtInMonat(cells, m),
            persist: persistEwtTableData,
          });
        },
        customButton: [
          {
            look: { variant: 'filled' },
            text: 'Alle Zeiten entfernen',
            /** Fragt per Snackbar nach, ob die Zeiten der berechneten Zeilen entfernt werden sollen. */
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
                    /** Leert die Zeitfelder aller berechneten, nicht gelöschten Zeilen des aktiven Monats und speichert die Tabelle. */
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
    // Bewusst einmalig: `ftE` ist stabil (wie in `NebenTab.tsx`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DBSection width="large" spacing="none" className="text-center">
      <div className="raster justify-content-center">
        <DBHeadingH1 className="d-inline-flex align-items-center justify-content-center gap-2">
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
        </DBHeadingH1>
        <MonatUeberschrift id="MonatE" />
      </div>

      <div>
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
      <DBDivider width="full" />

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
    </DBSection>
  );
}
