import { saveEinstellungen } from '.';
import { BereitschaftsEinsatzZeiträume } from '../../Bereitschaft';
import { createSnackBar } from '../../../infrastructure/ui/CustomSnackbar';
import { createCustomTable } from '../../../infrastructure/table/CustomTable';
import type { IVorgabenU, IVorgabenUvorgabenB } from '../../../interfaces';
import { default as Storage } from '../../../infrastructure/storage/Storage';
import { default as buttonDisable } from '../../../infrastructure/ui/buttonDisable';
import { EditorModalVE, ShowModalVE } from '../components';

export default function generateEingabeTabelleEinstellungenVorgabenB(VorgabenB?: {
  [key: string]: IVorgabenUvorgabenB;
}) {
  VorgabenB ??= Storage.check('VorgabenU') ? Storage.get<IVorgabenU>('VorgabenU', true).vorgabenB : {};

  const trueParser = (value: unknown): string => (value ? 'Ja' : 'Nein');

  const weekdayParser = (value: unknown, option: unknown = true): string => {
    const v = value as { tag: number; zeit: string; Nwoche?: boolean };
    const umbruch = option !== false;
    const separator = umbruch ? '<br/>' : ' | ';
    const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const weekday = weekdays[v.tag % 7] ?? '-';
    const week = v.tag === 0 && v.Nwoche ? 'W1' : v.Nwoche ? 'W2' : 'W1';
    return `${weekday} ${week}${separator}${v.zeit || '-'}`;
  };

  const nachtRangeParser = (value: unknown, option: unknown = true): string => {
    return weekdayParser(value, option);
  };

  const ftVE = createCustomTable('tableVE', {
    columns: [
      { name: 'Name', title: 'Name' },
      { name: 'standard', title: 'Std.', longTitle: 'Standard', parser: trueParser, breakpoints: 'lg' },
      { name: 'beginnB', title: 'Ber Von', longTitle: 'Bereitschaft Von', parser: weekdayParser, breakpoints: 'sm' },
      { name: 'endeB', title: 'Ber Bis', longTitle: 'Bereitschaft Bis', parser: weekdayParser, breakpoints: 'sm' },
      { name: 'nacht', title: 'Nacht?', parser: trueParser, breakpoints: 'lg' },
      {
        name: 'beginnN',
        title: 'Nacht Von',
        longTitle: 'Nachtschicht Von',
        parser: nachtRangeParser,
        breakpoints: 'lg',
      },
      { name: 'endeN', title: 'Nacht Bis', longTitle: 'Nachtschicht Bis', parser: nachtRangeParser, breakpoints: 'lg' },
    ],
    rows: [...Object.values(VorgabenB)],
    editing: {
      enabled: true,
      addRow: () => {
        EditorModalVE(ftVE, 'Voreinstellung hinzufügen');
      },
      editRow: row => {
        EditorModalVE(row, 'Voreinstellung bearbeiten');
      },
      showRow: row => {
        ShowModalVE(row, 'Voreinstellung anzeigen');
      },
      deleteRow: row => {
        if (!row.cells.standard) {
          row.deleteRow();
        } else {
          createSnackBar({
            message: 'Löschen von Standard nicht möglich<br /><small>(Bitte erst neuen Standard setzen)</small>',
            icon: '!',
            status: 'info',
            timeout: 3000,
            fixed: true,
          });
        }
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
                ftVE.rows.load([]);
                buttonDisable(false);
              },
              dismiss: true,
              class: ['text-danger'],
            },
            { text: 'Nein', dismiss: true, class: ['text-primary'] },
          ],
        });
      },
      customButton: [
        {
          text: 'Standardeinstellungen',
          classes: ['btn', 'btn-secondary'],
          function: () => {
            ftVE.rows.load(Object.values(BereitschaftsEinsatzZeiträume));
            saveEinstellungen();
          },
        },
      ],
    },
  });
}
