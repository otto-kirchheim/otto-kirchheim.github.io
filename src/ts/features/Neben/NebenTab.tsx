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

export function NebenTab() {
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

  const tagParser = (value: unknown) => {
    const s = value as string;
    const d = dayjs(s, 'DD.MM.YYYY', true);
    return d.isValid() ? d.format('dd DD.MM.') : s;
  };

  // Nur beim allerersten Aufruf gelesen (siehe `useCustomTableState()`s Docblock) -- exakt das
  // bisherige `useEffect(() => {...}, [])`-Verhalten, Closures (Jahr/checkIfGreater2024/...)
  // bleiben deshalb wie vorher auf den Mount-Zeitpunkt eingefroren.
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
    // Bewusst einmalig wie vorher (`useEffect(() => {...}, [])`) -- `ftN` ist stabil (siehe
    // `useCustomTableState()`), `Jahr`/`checkIfGreater2024` bleiben wie zuvor auf den
    // Mount-Zeitpunkt eingefroren.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DBSection width="large" spacing="none" className="text-center">
      <div className="raster justify-content-center">
        <DBHeadingH1 className="d-inline-flex align-items-center justify-content-center gap-2">
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
