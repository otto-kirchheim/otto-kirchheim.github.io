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

import DBLoadingButton from '@/shared/ui/button-loading/DBLoadingButton';
import MonatUeberschrift from '@/shared/ui/monat-ueberschrift/MonatUeberschrift';
import { createSnackBar } from '@/shared/ui/snackbar/CustomSnackbar';
import type { CustomTable } from '@/shared/ui/custom-table/CustomTable';
import { asAnyTable, useCustomTableState } from '@/shared/ui/custom-table/CustomTable';
import CustomTableView from '@/shared/ui/custom-table/CustomTableView';
import { invokeHook } from '@/shared/lib/feature';
import type { CustomHTMLTableElement, IDatenBE, IDatenBZ } from '@/types';
import { confirmDeleteAllRows } from '@/shared/lib/ressource/confirmDeleteAllRows';
import { createOnChangeHandler } from '@/shared/lib/autosave/autoSave';
import { getMonatFromBE, getMonatFromBZ } from '@/shared/lib/date/getMonatFromItem';
import { default as saveDaten } from '@/shared/lib/ressource/saveDaten';
import { bindClickHandlers } from '@/shared/lib/dom/bindClickHandlers';
import Storage from '@/shared/lib/storage/Storage';
import dayjs from '@/shared/lib/date/configDayjs';
import generatePDF from '@/shared/lib/pdf/generatePDF';
import {
  EditorModalBE,
  EditorModalBereitschaftsZeit,
  ShowModalBereitschaft,
  createAddModalBereitschaftsEinsatz,
  createAddModalBereitschaftsZeit,
} from '.';
import {
  getBereitschaftsEinsatzDaten,
  getBereitschaftsZeitraumDaten,
  persistBereitschaftsEinsatzTableData,
  persistBereitschaftsZeitraumTableData,
} from '../model';

/**
 * Bereitschaft-Tab: Tabellen für Bereitschaftszeiträume (BZ) und -einsätze (BE) samt Knopfleiste
 * (Anlegen, Speichern, PDF, Hilfe). Beide Tabellen werden auf den gewählten Monat gefiltert.
 */
export function BereitschaftTab() {
  /**
   * Prüft, ob ein Einsatz zeitlich mit einem Bereitschaftszeitraum überlappt. Endet der Einsatz vor
   * seinem Beginn, liegt das Ende am Folgetag.
   *
   * @param einsatz - Bereitschaftseinsatz (BE).
   * @param zeitraum - Bereitschaftszeitraum (BZ).
   * @returns `true` bei Überlappung der beiden Zeitfenster.
   */
  const isEinsatzLinkedToZeitraum = (einsatz: IDatenBE, zeitraum: IDatenBZ): boolean => {
    const einsatzDate = dayjs(einsatz.Tag, 'DD.MM.YYYY').format('YYYY-MM-DD');
    const einsatzStart = dayjs(`${einsatzDate}T${einsatz.Beginn}`);
    const einsatzEndRaw = dayjs(`${einsatzDate}T${einsatz.Ende}`);
    const einsatzEnd = einsatzEndRaw.isAfter(einsatzStart) ? einsatzEndRaw : einsatzEndRaw.add(1, 'day');
    const bzStart = dayjs(String(zeitraum.Beginn));
    const bzEnd = dayjs(String(zeitraum.Ende));

    return einsatzStart.isBefore(bzEnd) && einsatzEnd.isAfter(bzStart);
  };

  /**
   * Zählt die nicht gelöschten Einsätze (alle Monate), die mit dem Zeitraum überlappen.
   *
   * @param zeitraum - Bereitschaftszeitraum (BZ).
   * @returns Anzahl überlappender Einsätze.
   */
  const countLinkedEinsaetze = (zeitraum: IDatenBZ): number => {
    return getBereitschaftsEinsatzDaten(undefined, undefined, { scope: 'all', excludeDeleted: true }).filter(einsatz =>
      isEinsatzLinkedToZeitraum(einsatz, zeitraum),
    ).length;
  };

  /**
   * Spaltenparser für Datum und Zeit. Bis 768 px Breite in zwei Zeilen (Datum, Zeit), damit die Tabelle
   * nicht überläuft; liefert dann JSX (Spalte braucht `html: true`, Präzedenzfall `schichtParser` in `EwtTab.tsx`).
   *
   * @param value - ISO-Zeitstempel.
   * @returns Formatierter Text bzw. zweizeiliges JSX; der Rohwert bei ungültigem Datum.
   */
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
    /**
     * Spaltenparser für Zahlen, bei denen 0 als leer angezeigt wird.
     *
     * @param value - Zahl (oder leer).
     * @returns Leerer String bei falsy-Wert, sonst der Wert.
     */
    timeZeroParser = (value: unknown): number | string => (!value ? '' : (value as number)),
    ftBZ: CustomTable<IDatenBZ> = useCustomTableState<IDatenBZ>('tableBZ', {
      columns: [
        {
          name: 'Beginn',
          title: 'Von',
          // `parser` ist auf `string | number` typisiert; `html: true` ist der Ausnahmefall für JSX-liefernde Parser.
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
        /** Öffnet das Modal zum Anlegen eines Zeitraums. */
        addRow: () => {
          EditorModalBereitschaftsZeit(ftBZ, 'Zeitraum hinzufügen');
        },
        /**
         * Öffnet das Bearbeiten-Modal für den Zeitraum.
         *
         * @param row - Zu bearbeitende Zeile.
         */
        editRow: row => {
          EditorModalBereitschaftsZeit(row, 'Zeitraum bearbeiten');
        },
        /**
         * Öffnet das Anzeige-Modal für den Zeitraum.
         *
         * @param row - Anzuzeigende Zeile.
         */
        showRow: row => {
          ShowModalBereitschaft(row, 'Zeitraum anzeigen');
        },
        /**
         * Löscht den Zeitraum und speichert die Tabelle; mit Warnung abgebrochen, solange ein nicht gelöschter Einsatz in den Zeitraum fällt.
         *
         * @param row - Zu löschende Zeile.
         */
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
        /** Löscht nach Bestätigung alle Zeiträume des gewählten Monats; mit Warnung abgebrochen, solange ein Zeitraum des Monats noch verknüpfte Einsätze hat. */
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
            /**
             * Wählt die Zeiträume des Monats `m`.
             *
             * @param cells - Zellwerte der Zeile.
             * @param m - Monat (1-12).
             */
            rowFilter: (cells, m) => getMonatFromBZ(cells) === m,
            persist: persistBereitschaftsZeitraumTableData,
          });
        },
      },
    });

  // ----------------------------- Bereitschaftseinsätze ------------------------------------------------

  /**
   * Spaltenparser für das Einsatz-Datum.
   *
   * @param value - Datum im Format "DD.MM.YYYY".
   * @returns Kurzform "dd DD.MM."; der Rohwert bei ungültigem Datum.
   */
  const dateParser = (value: unknown) => {
      const d = dayjs(value as string, 'DD.MM.YYYY', true);
      return d.isValid() ? d.format('dd DD.MM.') : (value as string);
    },
    /**
     * Spaltenparser für die LRE-Art in Kurzform.
     *
     * @param value - LRE-Text, z. B. "LRE 1/2 ohne x".
     * @returns "-" bei leerem Wert, sonst z. B. "12oX" bzw. "12"; unbekannte Texte unverändert.
     */
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
          breakpoints: 'sm',
          type: 'number',
        },
      ],
      rows: getBereitschaftsEinsatzDaten(undefined, undefined, { scope: 'all' }),
      sorting: { enabled: true },
      onChange: createOnChangeHandler('BE'),
      editing: {
        enabled: true,
        /** Öffnet das Modal zum Anlegen eines Einsatzes. */
        addRow: () => {
          EditorModalBE(ftBE, 'Einsatz hinzufügen');
        },
        /**
         * Öffnet das Bearbeiten-Modal für den Einsatz.
         *
         * @param row - Zu bearbeitende Zeile.
         */
        editRow: row => {
          EditorModalBE(row, 'Einsatz bearbeiten');
        },
        /**
         * Öffnet das Anzeige-Modal für den Einsatz.
         *
         * @param row - Anzuzeigende Zeile.
         */
        showRow: row => {
          ShowModalBereitschaft(row, 'Einsatz anzeigen');
        },
        /**
         * Löscht den Einsatz und speichert die Tabelle.
         *
         * @param row - Zu löschende Zeile.
         */
        deleteRow: row => {
          row.deleteRow();
          persistBereitschaftsEinsatzTableData(ftBE);
        },
        /** Löscht nach Bestätigung alle Einsätze des gewählten Monats. */
        deleteAllRows: () => {
          confirmDeleteAllRows({
            table: ftBE,
            /**
             * Wählt die Einsätze des Monats `m`.
             *
             * @param cells - Zellwerte der Zeile.
             * @param m - Monat (1-12).
             */
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
      ['btnHelpBereitschaft', () => invokeHook('help:open', 'tab.bereitschaft')],
    ]);

    const monat = Storage.get<number>('Monat', { default: dayjs().month() + 1 });
    ftBZ.rows.setFilter(row => getMonatFromBZ(row) === monat);
    ftBE.rows.setFilter(row => getMonatFromBE(row) === monat);

    return unbindButtons;
    // Bewusst einmalig: `ftBZ`/`ftBE` sind stabil (siehe `NebenTab.tsx`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DBSection width="large" spacing="none" className="text-center">
      <div className="raster justify-content-center">
        <DBHeadingH1 className="d-inline-flex align-items-center justify-content-center gap-2">
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
        </DBHeadingH1>
        <MonatUeberschrift id="MonatB" />
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
      <DBHeadingH4 paragraphSpacing id="titelBZ">
        Bereitschaftszeitraum
      </DBHeadingH4>
      <div className="db-table" data-width="full" data-variant="zebra" data-divider="both" data-size="small">
        <table
          id="tableBZ"
          className="align-middle"
          aria-describedby="titelBZ"
          ref={(el: HTMLTableElement | null) => {
            if (el) ftBZ.attachElement(el as CustomHTMLTableElement<IDatenBZ>);
          }}
        >
          <CustomTableView table={asAnyTable(ftBZ)} />
        </table>
      </div>
      <DBDivider width="full" />
      <DBHeadingH4 paragraphSpacing id="titelBE">
        Bereitschaftseinsätze
      </DBHeadingH4>
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
