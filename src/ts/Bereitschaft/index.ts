import { createSnackBar } from '../class/CustomSnackbar';
import type { CustomTable } from '../class/CustomTable';
import { createCustomTable } from '../class/CustomTable';
import type { IDatenBE, IDatenBZ, IVorgabenUvorgabenB } from '../interfaces';
import { buttonDisable, createOnChangeHandler, saveDaten } from '../utilities';
import dayjs from '../utilities/configDayjs';
import download from '../utilities/download';
import {
  EditorModalBE,
  EditorModalBereitschaftsZeit,
  ShowModalBereitschaft,
  createAddModalBereitschaftsEinsatz,
  createAddModalBereitschaftsZeit,
} from './components';
import { DataBE, DataBZ, saveTableDataBE, saveTableDataBZ } from './utils';

export const BereitschaftsEinsatzZeiträume: { [key: number]: IVorgabenUvorgabenB } = {
  0: {
    Name: 'B1',
    beginnB: { tag: 4, zeit: '15:45' },
    endeB: { tag: 4, zeit: '07:00', Nwoche: true },
    nacht: false,
    beginnN: { tag: 0, zeit: '19:45', Nwoche: true },
    endeN: { tag: 4, zeit: '06:15', Nwoche: true },
  },
  1: {
    Name: 'B2',
    beginnB: { tag: 4, zeit: '15:45' },
    endeB: { tag: 0, zeit: '19:45', Nwoche: false },
    nacht: false,
    beginnN: { tag: 0, zeit: '19:45', Nwoche: false },
    endeN: { tag: 4, zeit: '06:15', Nwoche: true },
  },
  2: {
    Name: 'B1 + Nacht',
    beginnB: { tag: 4, zeit: '15:45' },
    endeB: { tag: 4, zeit: '07:00', Nwoche: true },
    nacht: true,
    beginnN: { tag: 0, zeit: '19:45', Nwoche: true },
    endeN: { tag: 4, zeit: '06:15', Nwoche: true },
    standard: true,
  },
  3: {
    Name: 'B1 + Nacht (ab Sa)',
    beginnB: { tag: 4, zeit: '15:45' },
    endeB: { tag: 4, zeit: '07:00', Nwoche: true },
    nacht: true,
    beginnN: { tag: 6, zeit: '19:45', Nwoche: false },
    endeN: { tag: 3, zeit: '06:15', Nwoche: true },
  },
};

window.addEventListener('load', () => {
  const isEinsatzLinkedToZeitraum = (einsatz: IDatenBE, zeitraum: IDatenBZ): boolean => {
    const einsatzDate = dayjs(einsatz.tagBE, 'DD.MM.YYYY').format('YYYY-MM-DD');
    const einsatzStart = dayjs(`${einsatzDate}T${einsatz.beginBE}`);
    const einsatzEndRaw = dayjs(`${einsatzDate}T${einsatz.endeBE}`);
    const einsatzEnd = einsatzEndRaw.isAfter(einsatzStart) ? einsatzEndRaw : einsatzEndRaw.add(1, 'day');
    const bzStart = dayjs(String(zeitraum.beginB));
    const bzEnd = dayjs(String(zeitraum.endeB));

    // Überlappung: BE-Zeitfenster überlappt mit BZ-Zeitfenster
    return einsatzStart.isBefore(bzEnd) && einsatzEnd.isAfter(bzStart);
  };

  const countLinkedEinsaetze = (zeitraum: IDatenBZ): number => {
    return DataBE().filter(einsatz => isEinsatzLinkedToZeitraum(einsatz, zeitraum)).length;
  };

  const datetimeParser = (value: string): string => dayjs(value).format('DD.MM.YYYY, LT'),
    timeZeroParser = (value: number): number | string => (!value ? '' : value),
    ftBZ: CustomTable<IDatenBZ> = createCustomTable<IDatenBZ>('tableBZ', {
      columns: [
        { name: 'beginB', title: 'Von', parser: datetimeParser, sortable: true, sorted: true, direction: 'ASC' },
        { name: 'endeB', title: 'Bis', parser: datetimeParser, sortable: true },
        { name: 'pauseB', title: 'Pause', parser: timeZeroParser, breakpoints: 'xs' },
      ],
      rows: DataBZ(),
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
          const beImZeitraum = DataBE().some(einsatz => isEinsatzLinkedToZeitraum(einsatz, bzToDelete));
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
          saveTableDataBZ(ftBZ);
        },
        deleteAllRows: () => {
          const hasLinked = DataBZ().some(zeitraum => countLinkedEinsaetze(zeitraum) > 0);
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

          createSnackBar({
            message: 'Möchtest du wirklich alle Zeilen löschen?',
            icon: 'question',
            status: 'error',
            dismissible: false,
            timeout: false,
            fixed: true,
            actions: [
              {
                text: 'Ja',
                function: () => {
                  ftBZ.rows.deleteAll();
                  buttonDisable(false);
                  saveTableDataBZ(ftBZ);
                },
                dismiss: true,
                class: ['text-danger'],
              },
              { text: 'Nein', dismiss: true, class: ['text-primary'] },
            ],
          });
        },
      },
    });

  // ----------------------------- Bereitschaftseinsätze ------------------------------------------------

  const ftBE: CustomTable<IDatenBE> = createCustomTable<IDatenBE>('tableBE', {
    columns: [
      { name: 'tagBE', title: 'Tag', sortable: true, sorted: true, direction: 'ASC' },
      { name: 'auftragsnummerBE', title: 'Auftrags-Nr.', sortable: true, classes: ['custom-text-truncate'] },
      { name: 'beginBE', title: 'Von', sortable: true, breakpoints: 'sm', type: 'time' },
      { name: 'endeBE', title: 'Bis', sortable: true, breakpoints: 'sm', type: 'time' },
      { name: 'lreBE', title: 'LRE', sortable: true },
      { name: 'privatkmBE', title: 'Privat Km', parser: timeZeroParser, breakpoints: 'md' },
    ],
    rows: DataBE(),
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
        // Neue Logik: Bereitschaftseinsatz kann immer gelöscht werden
        row.deleteRow();
        saveTableDataBE(ftBE);
      },
      deleteAllRows: () => {
        createSnackBar({
          message: 'Möchtest du wirklich alle Zeilen löschen?',
          icon: 'question',
          status: 'error',
          dismissible: false,
          timeout: false,
          fixed: true,
          actions: [
            {
              text: 'Ja',
              function: () => {
                ftBE.rows.deleteAll();
                buttonDisable(false);
                saveTableDataBE(ftBE);
              },
              dismiss: true,
              class: ['text-danger'],
            },
            { text: 'Nein', dismiss: true, class: ['text-primary'] },
          ],
        });
      },
    },
  });

  // "click"-Eventlistener
  const btnESZ = document.querySelector<HTMLButtonElement>('#btnESZ');
  const btnESE = document.querySelector<HTMLButtonElement>('#btnESE');
  const btnSaveB = document.querySelector<HTMLButtonElement>('#btnSaveB');
  const btnDownloadB = document.querySelector<HTMLButtonElement>('#btnDownloadB');

  btnESZ?.addEventListener('click', createAddModalBereitschaftsZeit);
  btnESE?.addEventListener('click', createAddModalBereitschaftsEinsatz);
  btnSaveB?.addEventListener('click', () => {
    saveDaten(btnSaveB);
  });
  btnDownloadB?.addEventListener('click', () => {
    download(btnDownloadB, 'B');
  });
});
