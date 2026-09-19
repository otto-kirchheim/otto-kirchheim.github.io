import { DBButton, DBDivider, DBStack, DBTooltip } from '@db-ux/react-core-components';
import { useEffect } from 'react';

import { DBLoadingButton } from '@/components';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { asAnyTable, useCustomTableState } from '@/infrastructure/table/CustomTable';
import CustomTableView from '@/infrastructure/table/CustomTableView';
import type { CustomHTMLTableElement, IDatenEA } from '@/types';
import { openHelpModal } from '@/core';
import { confirmDeleteAllRows } from '@/infrastructure/data/confirmDeleteAllRows';
import { getMonatFromEA } from '@/infrastructure/date/getMonatFromItem';
import Storage from '@/infrastructure/storage/Storage';
import { createOnChangeHandler } from '@/infrastructure/autoSave/autoSave';
import { default as saveDaten } from '@/infrastructure/data/saveDaten';
import { bindClickHandlers } from '@/infrastructure/ui/bindClickHandlers';
import dayjs from '@/infrastructure/date/configDayjs';
import generatePDF from '@/infrastructure/data/generatePDF';
import { EditorModalEA, ShowModalEA, createAddModalEA } from './components';
import { getEaDaten, persistEaTableData } from './utils';

export function EaTab() {
  const Jahr: number = Storage.get('Jahr', { default: dayjs().year() });

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

  const tagParser = (value: unknown) => {
      const s = value as string;
      // Erst strikt deutsch parsen (lokale Speicherpfade schreiben 'DD.MM.YYYY', z. B.
      // `addEaTag.ts`), erst danach locker fuer ISO-Strings vom Server --
      // `dayjs(s, 'DD.MM.YYYY')` allein laesst ISO ungueltig, `dayjs(s)` allein laesst
      // deutsch ungueltig (gleiches Muster wie `getMonatFromEA`).
      const strict = dayjs(s, 'DD.MM.YYYY', true);
      const d = strict.isValid() ? strict : dayjs(s);
      return d.isValid() ? d.format('dd DD.MM.') : s;
    },
    getEmptyText = (Jahr: number) => (checkIfGreater2025(Jahr) ? 'Keine Daten gefunden' : 'Neu ab 2025');

  // Nur beim allerersten Aufruf gelesen (siehe `useCustomTableState()`s Docblock) -- exakt das
  // bisherige `useEffect(() => {...}, [])`-Verhalten.
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
      addRow: () => {
        if (checkIfGreater2025(Jahr, true)) createAddModalEA(ftEA);
      },
      editRow: row => {
        EditorModalEA(row, 'Entgeltausgleich bearbeiten');
      },
      showRow: row => {
        ShowModalEA(row, 'Entgeltausgleich anzeigen');
      },
      deleteRow: row => {
        row.deleteRow();
        persistEaTableData(ftEA);
      },
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
    // Bewusst einmalig wie vorher -- `ftEA` ist stabil, `Jahr`/`checkIfGreater2025` bleiben auf
    // den Mount-Zeitpunkt eingefroren (siehe `NebenTab.tsx`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mitte text-center">
      <div className="raster justify-content-center">
        <h1 className="d-inline-flex align-items-center justify-content-center gap-2">
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
        </h1>
        <h4 id="MonatEA"></h4>
      </div>

      <div className="mitte">
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
    </div>
  );
}
