import { saveEinstellungen } from '../utils';
import { BereitschaftsEinsatzZeiträume } from '../../Bereitschaft/utils/constants';
import { createSnackBar } from '@/infrastructure/ui/CustomSnackbar';
import { asAnyTable, useCustomTableState } from '@/infrastructure/table/CustomTable';
import CustomTableView from '@/infrastructure/table/CustomTableView';
import type { CustomHTMLTableElement, IVorgabenU, IVorgabenUvorgabenB } from '@/types';
import { default as Storage } from '@/infrastructure/storage/Storage';
import { default as buttonDisable } from '@/infrastructure/ui/buttonDisable';
import { EditorModalVE, ShowModalVE } from '.';
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

const trueParser = (value: unknown): string => (value ? 'Ja' : 'Nein');

const weekdayParser = (value: unknown, option: unknown = true): string => {
  const v = value as { tag: number; zeit?: string; Nwoche?: boolean };
  const umbruch = option !== false;
  // Zeilenumbruch als echtes Zeichen: CustomTable setzt Zellen als Text, `<br/>` stuende
  // sonst woertlich in der Zelle. Die Spalten tragen dafuer `cell-multiline`.
  const separator = umbruch ? '\n' : ' | ';
  const weekdays: Record<number, string> = { 1: 'Mo', 2: 'Di', 3: 'Mi', 4: 'Do', 5: 'Fr', 6: 'Sa', 7: 'So', 0: 'So' };
  const weekday = weekdays[v.tag] ?? '-';
  const week = v.Nwoche ? 'W2' : 'W1';
  return `${weekday} ${week}${separator}${v.zeit || '-'}`;
};

const nachtRangeParser = (value: unknown, option: unknown = true): string => {
  return weekdayParser(value, option);
};

/**
 * `.instance`-Anker fuer `#tableVE` (Achse B des `useReducer`-Umbaus). Eigene, kleine
 * Feature-Komponente statt Teil von `infrastructure/ui/EinstellungenTab.tsx` -- die Huelle
 * dort ist bewusst infrastructure-schichtig und darf laut Architektur (`CLAUDE.md`) nicht auf
 * `features/` zugreifen (analog `PersoenlicheDatenPanel`, das aus demselben Grund schon als
 * eigene Feature-Komponente eingebunden ist). `generateEingabeMaskeEinstellungen.ts`/
 * `generateEingabeTabelleEinstellungenVorgabenB.ts` bleiben unveraendert `document.querySelector
 * ('#tableVE')?.instance`-basiert und laden nur noch Daten (`rows.load()`) -- die Instanz wird
 * seit Achse B ausschliesslich hier, einmalig bei Mount, konstruiert.
 */
export default function VorgabenBTable() {
  // Nur beim allerersten Mount gelesen (siehe `useCustomTableState()`s Docblock) -- deckt sich
  // mit dem bisherigen Erstanlage-Zeitpunkt von `generateEingabeTabelleEinstellungenVorgabenB()`.
  const initialVorgabenB = Storage.check('VorgabenU') ? Storage.get<IVorgabenU>('VorgabenU', true).VorgabenB : {};

  const ftVE = useCustomTableState<IVorgabenUvorgabenB>('tableVE', {
    columns: [
      { name: 'Name', title: 'Name' },
      { name: 'standard', title: 'Standard', longTitle: 'Standard', parser: trueParser, breakpoints: 'md' },
      {
        classes: ['cell-multiline'],
        name: 'beginnB',
        title: 'Ber Von',
        longTitle: 'Bereitschaft Von',
        parser: weekdayParser,
        breakpoints: 'sm',
      },
      {
        classes: ['cell-multiline'],
        name: 'endeB',
        title: 'Ber Bis',
        longTitle: 'Bereitschaft Bis',
        parser: weekdayParser,
        breakpoints: 'sm',
      },
      { name: 'nacht', title: 'Nacht?', parser: trueParser, breakpoints: 'md' },
      {
        classes: ['cell-multiline'],
        name: 'beginnN',
        title: 'Nacht Von',
        longTitle: 'Nachtschicht Von',
        parser: nachtRangeParser,
        breakpoints: 'md',
      },
      {
        classes: ['cell-multiline'],
        name: 'endeN',
        title: 'Nacht Bis',
        longTitle: 'Nachtschicht Bis',
        parser: nachtRangeParser,
        breakpoints: 'md',
      },
    ],
    rows: [...Object.values(initialVorgabenB ?? {})],
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
            },
            { text: 'Nein', dismiss: true },
          ],
        });
      },
      customButton: [
        {
          text: 'Standardeinstellungen',
          look: { variant: 'filled' },
          function: async () => {
            const code = Storage.check('VorgabenU')
              ? Storage.get<IVorgabenU>('VorgabenU', true).Pers.ErsteTkgSt.toLowerCase()
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

  return (
    <table
      id="tableVE"
      className="align-middle"
      aria-label="Voreinstellungen Bereitschaft"
      ref={(el: HTMLTableElement | null) => {
        if (el) ftVE.attachElement(el as CustomHTMLTableElement<IVorgabenUvorgabenB>);
      }}
    >
      <CustomTableView table={asAnyTable(ftVE)} />
    </table>
  );
}
