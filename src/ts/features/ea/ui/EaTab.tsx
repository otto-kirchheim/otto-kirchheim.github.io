import { DBButton, DBDivider, DBHeadingH1, DBSection, DBStack, DBTooltip } from '@db-ux/react-core-components';
import { useEffect } from 'react';

import { DBLoadingButton } from '@/components';
import MonatUeberschrift from '@/infrastructure/ui/MonatUeberschrift';
import { createSnackBar } from '@/shared/ui/snackbar/CustomSnackbar';
import { asAnyTable, useCustomTableState } from '@/shared/ui/custom-table/CustomTable';
import CustomTableView from '@/shared/ui/custom-table/CustomTableView';
import type { CustomHTMLTableElement, IDatenEA } from '@/types';
import { openHelpModal } from '@/core';
import { confirmDeleteAllRows } from '@/shared/lib/ressource/confirmDeleteAllRows';
import { getMonatFromEA } from '@/shared/lib/date/getMonatFromItem';
import Storage from '@/shared/lib/storage/Storage';
import { createOnChangeHandler } from '@/shared/lib/autosave/autoSave';
import { default as saveDaten } from '@/shared/lib/ressource/saveDaten';
import { bindClickHandlers } from '@/shared/lib/dom/bindClickHandlers';
import dayjs from '@/shared/lib/date/configDayjs';
import generatePDF from '@/shared/lib/pdf/generatePDF';
import { EditorModalEA, ShowModalEA, createAddModalEA } from '.';
import { getEaDaten, persistEaTableData } from '../model';

/**
 * Tab "Entgeltausgleich": Tabelle der EA-Einträge des aktiven Monats samt Hinzufügen-, Speichern-,
 * PDF- und Hilfe-Buttons. Entgeltausgleich gibt es erst ab 2025.
 */
export function EaTab() {
  const Jahr: number = Storage.get('Jahr', { default: dayjs().year() });

  /**
   * Prüft, ob das Jahr Entgeltausgleich zulässt (ab 2025).
   *
   * @param Jahr - Zu prüfendes Jahr.
   * @param showError - Bei true erscheint bei unzulässigem Jahr eine Fehler-Snackbar.
   * @returns true, wenn `Jahr >= 2025`.
   */
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

  /**
   * Formatiert einen Tag-Zellwert für die Anzeige als `dd DD.MM.`.
   *
   * @param value - Tag als `DD.MM.YYYY` (lokale Pfade wie `addEaTag.ts`) oder ISO-String vom Server.
   * @returns Formatierter Tag; bei nicht parsbarem Wert der Originalstring.
   */
  const tagParser = (value: unknown) => {
      const s = value as string;
      // Erst strikt deutsch parsen, dann locker für ISO: `dayjs(s, 'DD.MM.YYYY')` allein lässt ISO
      // ungültig, `dayjs(s)` allein lässt deutsche Daten ungültig (Muster wie `getMonatFromEA`).
      const strict = dayjs(s, 'DD.MM.YYYY', true);
      const d = strict.isValid() ? strict : dayjs(s);
      return d.isValid() ? d.format('dd DD.MM.') : s;
    },
    /**
     * Liefert den Leertext der Tabelle.
     *
     * @param Jahr - Aktives Jahr.
     * @returns Hinweis "Neu ab 2025" vor 2025, sonst "Keine Daten gefunden".
     */
    getEmptyText = (Jahr: number) => (checkIfGreater2025(Jahr) ? 'Keine Daten gefunden' : 'Neu ab 2025');

  // Optionen werden nur beim ersten Aufruf gelesen (siehe Docblock von `useCustomTableState()`).
  const ftEA = useCustomTableState<IDatenEA>('tableEA', {
    columns: [
      { name: 'Tag', title: 'Tag', sortable: true, sorted: true, direction: 'ASC', parser: tagParser },
      { name: 'Dauer', title: 'Dauer', longTitle: 'Dauer', type: 'time' },
      { name: 'Taetigkeit', title: 'Tätigkeit', longTitle: 'Tätigkeit', breakpoints: 'sm' },
      { name: 'Entgeltgruppe', title: 'Entgeltgruppe', longTitle: 'Entgeltgruppe', breakpoints: 'sm' },
    ],
    empty: () => getEmptyText(Jahr),
    rows: getEaDaten(undefined, undefined, { scope: 'all' }),
    sorting: { enabled: true },
    onChange: createOnChangeHandler('EA'),
    editing: {
      enabled: true,
      /** Öffnet das Hinzufügen-Modal (nur ab 2025). */
      addRow: () => {
        if (checkIfGreater2025(Jahr, true)) createAddModalEA(ftEA);
      },
      /**
       * Öffnet das Bearbeiten-Modal der Zeile.
       *
       * @param row - Zu bearbeitende EA-Zeile.
       */
      editRow: row => {
        EditorModalEA(row, 'Entgeltausgleich bearbeiten');
      },
      /**
       * Öffnet das Anzeige-Modal der Zeile.
       *
       * @param row - Anzuzeigende EA-Zeile.
       */
      showRow: row => {
        ShowModalEA(row, 'Entgeltausgleich anzeigen');
      },
      /**
       * Löscht die Zeile und speichert die Tabelle in den Storage.
       *
       * @param row - Zu löschende EA-Zeile.
       */
      deleteRow: row => {
        row.deleteRow();
        persistEaTableData(ftEA);
      },
      /** Löscht nach Bestätigung alle Zeilen des aktiven Monats. */
      deleteAllRows: () => {
        confirmDeleteAllRows({
          table: ftEA,
          rowFilter: (cells, m) => getMonatFromEA(cells) === m,
          persist: persistEaTableData,
        });
      },
    },
  });

  useEffect(() => {
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

    const monat = Storage.get<number>('Monat', { default: dayjs().month() + 1 });
    ftEA.rows.setFilter(
      row => getMonatFromEA(row) === monat && checkIfGreater2025(Storage.get<number>('Jahr', { default: Jahr })),
    );

    return unbindButtons;
    // Bewusst einmalig: `ftEA` ist stabil, `Jahr`/`checkIfGreater2025` bleiben auf den Mount-Zeitpunkt
    // eingefroren (wie in `NebenTab.tsx`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DBSection width="large" spacing="none" className="text-center">
      <div className="raster justify-content-center">
        <DBHeadingH1 className="d-inline-flex align-items-center justify-content-center gap-2">
          Entgeltausgleich
          <DBButton
            type="button"
            className="p-0"
            variant="ghost"
            size="small"
            id="btnHelpEA"
            icon="question_mark_circle"
            noText
            aria-label="Hilfe anzeigen"
          >
            <DBTooltip>Hilfe anzeigen</DBTooltip>
          </DBButton>
        </DBHeadingH1>
        <MonatUeberschrift id="MonatEA" />
      </div>

      <div>
        <DBStack direction="row" wrap justifyContent="center" gap="medium" className="my-3 knopfreihe">
          <DBButton type="button" variant="brand" icon="plus" id="btnESEA" data-disabler>
            Hinzufügen
          </DBButton>
          <DBLoadingButton
            type="button"
            variant="filled"
            data-color="successful"
            icon="save"
            id="btnSaveEA"
            data-disabler
            autoSaveResources={['EA']}
          >
            Speichern
          </DBLoadingButton>
          <DBLoadingButton type="button" variant="filled" icon="download" id="btnDownloadEA" data-disabler>
            PDF erzeugen
          </DBLoadingButton>
        </DBStack>
      </div>
      <DBDivider width="full" />

      <div className="db-table" data-width="full" data-variant="zebra" data-divider="both" data-size="small">
        <table
          id="tableEA"
          className="align-middle"
          aria-label="Entgeltausgleich"
          ref={(el: HTMLTableElement | null) => {
            if (el) ftEA.attachElement(el as CustomHTMLTableElement<IDatenEA>);
          }}
        >
          <CustomTableView table={asAnyTable(ftEA)} />
        </table>
      </div>
    </DBSection>
  );
}
