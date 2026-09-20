import {
  DBButton,
  DBDivider,
  DBHeadingH1,
  DBHeadingH4,
  DBSection,
  DBStack,
  DBTooltip,
} from '@db-ux/react-core-components';
import { useEffect } from 'react';

import { DBLoadingButton } from '@/components';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { asAnyTable, useCustomTableState } from '@/infrastructure/table/CustomTable';
import CustomTableView from '@/infrastructure/table/CustomTableView';
import type { CustomHTMLTableElement, IDatenN } from '@/types';
import { openHelpModal } from '@/core';
import { confirmDeleteAllRows } from '@/infrastructure/data/confirmDeleteAllRows';
import { getMonatFromN } from '@/infrastructure/date/getMonatFromItem';
import Storage from '@/infrastructure/storage/Storage';
import { createOnChangeHandler } from '@/infrastructure/autoSave/autoSave';
import { default as saveDaten } from '@/infrastructure/data/saveDaten';
import { bindClickHandlers } from '@/infrastructure/ui/bindClickHandlers';
import dayjs from '@/infrastructure/date/configDayjs';
import generatePDF from '@/infrastructure/data/generatePDF';
import { EditorModalNeben, ShowModalNeben, createAddModalNeben } from './components';
import { getNebengeldDaten, persistNebengeldTableData } from './utils';

/**
 * Neben-Tab: Tabelle `#tableN` mit Toolbar (Hinzufügen, Speichern, PDF, Hilfe). Erschwerniszulagen gibt es erst ab 2024; für frühere Jahre bleibt die Tabelle leer und Hinzufügen/PDF melden das per Snackbar.
 */
export function NebenTab() {
  const Jahr: number = Storage.get('Jahr', { default: dayjs().year() });

  /**
   * Prüft, ob für das Jahr Nebengelder erfasst werden können (ab 2024).
   *
   * @param Jahr - Zu prüfendes Jahr.
   * @param showError - `true` zeigt bei einem Jahr vor 2024 eine Fehlermeldung.
   * @returns `true`, wenn das Jahr 2024 oder später ist.
   */
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

  /**
   * Liefert den Text der leeren Tabelle.
   *
   * @param Jahr - Angezeigtes Jahr.
   * @returns Text für die leere Tabelle.
   */
  const getEmptyText = (Jahr: number) => (checkIfGreater2024(Jahr) ? 'Keine Daten gefunden' : 'Neu ab 2024');

  /**
   * Formatiert das Datum der Spalte "Tag" für die Anzeige.
   *
   * @param value - Datum als `DD.MM.YYYY`.
   * @returns Anzeigeformat `dd DD.MM.`; ein ungültiges Datum bleibt unverändert.
   */
  const tagParser = (value: unknown) => {
    const s = value as string;
    const d = dayjs(s, 'DD.MM.YYYY', true);
    return d.isValid() ? d.format('dd DD.MM.') : s;
  };

  // `options` wird nur beim ersten Render gelesen (siehe `useCustomTableState()`); die Closures
  // (`Jahr`, `checkIfGreater2024`, ...) bleiben daher auf den Mount-Zeitpunkt eingefroren.
  const ftN = useCustomTableState<IDatenN>('tableN', {
    columns: [
      {
        name: 'Tag',
        title: 'Tag',
        sortable: true,
        sorted: true,
        direction: 'ASC',
        parser: tagParser,
      },
      { name: 'Beginn', title: 'Arbeit Von', longTitle: 'Arbeitszeit Von', type: 'time' },
      { name: 'Ende', title: 'Arbeit Bis', longTitle: 'Arbeitszeit Bis', type: 'time' },
      {
        name: 'zulagenAnzeigeN',
        title: 'Zulagen',
        longTitle: 'Zulagen',
        breakpoints: 'sm',
        classes: ['cell-multiline'],
        /**
         * Zeigt den Zulagentext oder `-`, wenn keiner vorhanden ist.
         *
         * @param value - Zellwert der Spalte `zulagenAnzeigeN`.
         * @returns Anzeigetext.
         */
        parser: (value: unknown) => (typeof value === 'string' && value.length > 0 ? value : '-'),
      },
      {
        name: 'Auftragsnummer',
        title: 'Auftragsnummer',
        breakpoints: 'sm',
        /**
         * Gruppiert die Auftragsnummer von rechts in Dreierblöcke mit Leerzeichen; `-` bei leerem Wert.
         *
         * @param value - Zellwert der Spalte `Auftragsnummer`.
         * @returns Anzeigetext.
         */
        parser: (value: unknown) => {
          const s = value as string;
          return s ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '-';
        },
      },
    ],
    /**
     * Text der leeren Tabelle für das beim Mount gelesene Jahr.
     *
     * @returns Text für die leere Tabelle.
     */
    empty: () => getEmptyText(Jahr),
    rows: getNebengeldDaten(undefined, undefined, { scope: 'all' }),
    sorting: { enabled: true },
    onChange: createOnChangeHandler('N'),
    editing: {
      enabled: true,
      /**
       * Öffnet den Editor-Dialog für eine neue Zeile.
       */
      addRow: () => {
        EditorModalNeben(ftN, 'Nebenbezug hinzufügen');
      },
      /**
       * Öffnet den Editor-Dialog für eine bestehende Zeile.
       *
       * @param row - Zu bearbeitende Zeile.
       */
      editRow: row => {
        EditorModalNeben(row, 'Nebenbezug bearbeiten');
      },
      /**
       * Öffnet den Anzeige-Dialog einer Zeile.
       *
       * @param row - Anzuzeigende Zeile.
       */
      showRow: row => {
        ShowModalNeben(row, 'Nebenbezug anzeigen');
      },
      /**
       * Löscht die Zeile und schreibt die Tabelle in den Storage.
       *
       * @param row - Zu löschende Zeile.
       */
      deleteRow: row => {
        row.deleteRow();
        persistNebengeldTableData(ftN);
      },
      /**
       * Löscht nach Rückfrage alle Zeilen des gewählten Monats und schreibt die Tabelle in den Storage.
       */
      deleteAllRows: () => {
        confirmDeleteAllRows({
          table: ftN,
          rowFilter: (cells, m) => getMonatFromN(cells) === m,
          persist: persistNebengeldTableData,
        });
      },
    },
  });

  useEffect(() => {
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

    const monat = Storage.get<number>('Monat', { default: dayjs().month() + 1 });
    ftN.rows.setFilter(
      row => getMonatFromN(row) === monat && checkIfGreater2024(Storage.get<number>('Jahr', { default: Jahr })),
    );

    return unbindButtons;
    // Bewusst einmalig: `ftN` ist stabil (siehe `useCustomTableState()`), `Jahr` und
    // `checkIfGreater2024` bleiben auf den Mount-Zeitpunkt eingefroren.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DBSection width="large" spacing="none" className="text-center">
      <div className="raster justify-content-center">
        <DBHeadingH1 className="d-inline-flex align-items-center justify-content-center gap-2">
          Zulagen
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
        </DBHeadingH1>
        <DBHeadingH4 paragraphSpacing id="MonatN"></DBHeadingH4>
      </div>

      <div>
        <DBStack direction="row" wrap justifyContent="center" gap="medium" className="my-3 knopfreihe">
          <DBButton type="button" variant="brand" icon="plus" id="btnESN" data-disabler>
            Hinzufügen
          </DBButton>
          <DBLoadingButton
            type="button"
            variant="filled"
            data-color="successful"
            icon="save"
            id="btnSaveN"
            data-disabler
            autoSaveResources={['N']}
          >
            Speichern
          </DBLoadingButton>
          <DBLoadingButton type="button" variant="filled" icon="download" id="btnDownloadN" data-disabler>
            PDF erzeugen
          </DBLoadingButton>
        </DBStack>
      </div>
      <DBDivider width="full" />

      <div className="db-table" data-width="full" data-variant="zebra" data-divider="both" data-size="small">
        <table
          id="tableN"
          className="align-middle"
          aria-label="Nebengeld"
          ref={(el: HTMLTableElement | null) => {
            if (el) ftN.attachElement(el as CustomHTMLTableElement<IDatenN>);
          }}
        >
          <CustomTableView table={asAnyTable(ftN)} />
        </table>
      </div>
    </DBSection>
  );
}
