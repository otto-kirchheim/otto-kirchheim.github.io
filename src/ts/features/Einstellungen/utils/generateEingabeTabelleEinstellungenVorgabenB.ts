import { saveEinstellungen } from '.';
import { BereitschaftsEinsatzZeiträume } from '../../Bereitschaft';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { createCustomTable } from '@/infrastructure/table/CustomTable';
import type { IVorgabenU, IVorgabenUvorgabenB } from '@/types';
import { default as Storage } from '@/infrastructure/storage/Storage';
import { default as buttonDisable } from '@/infrastructure/ui/buttonDisable';
import { EditorModalVE, ShowModalVE } from '../components';
import { apiFetch } from '@/infrastructure/api/apiFetchHelper';

type ProfileTemplateVorgabenBResponse = {
  template?: { VorgabenB?: Array<{ key: string; value: Record<string, unknown> }> };
};

async function fetchTemplateVorgabenB(code: string): Promise<IVorgabenUvorgabenB[] | null> {
  try {
    const result = await apiFetch<undefined, ProfileTemplateVorgabenBResponse>(
      `profile-templates/code/${code.toLowerCase()}`,
    );
    const entries = result?.template?.VorgabenB;
    if (entries && entries.length > 0) return entries.map(e => e.value as IVorgabenUvorgabenB);
    return null;
  } catch {
    return null;
  }
}

export default function generateEingabeTabelleEinstellungenVorgabenB(VorgabenB?: {
  [key: string]: IVorgabenUvorgabenB;
}) {
  VorgabenB ??= Storage.check('VorgabenU') ? Storage.get<IVorgabenU>('VorgabenU', true).vorgabenB : {};

  const trueParser = (value: unknown): string => (value ? 'Ja' : 'Nein');

  const weekdayParser = (value: unknown, option: unknown = true): string => {
    const v = value as { tag: number; zeit: string; Nwoche?: boolean };
    const umbruch = option !== false;
    const separator = umbruch ? '<br/>' : ' | ';
    const weekdays: Record<number, string> = { 1: 'Mo', 2: 'Di', 3: 'Mi', 4: 'Do', 5: 'Fr', 6: 'Sa', 7: 'So', 0: 'So' };
    const weekday = weekdays[v.tag] ?? '-';
    const week = v.Nwoche ? 'W2' : 'W1';
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
          function: async () => {
            const code = Storage.check('VorgabenU')
              ? Storage.get<IVorgabenU>('VorgabenU', true).pers.ErsteTkgSt.toLowerCase()
              : '';
            let vorgabenB = code ? await fetchTemplateVorgabenB(code) : null;
            if (!vorgabenB) vorgabenB = await fetchTemplateVorgabenB('muster');
            ftVE.rows.load(vorgabenB ?? Object.values(BereitschaftsEinsatzZeiträume));
            saveEinstellungen();
          },
        },
      ],
    },
  });
}
