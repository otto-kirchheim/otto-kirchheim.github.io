import { invokeHook } from '@/shared/lib/feature';
import { BereitschaftsEinsatzZeiträume } from '../model/constants';
import { createSnackBar } from '@/shared/ui/snackbar/CustomSnackbar';
import { asAnyTable, useCustomTableState } from '@/shared/ui/custom-table/CustomTable';
import CustomTableView from '@/shared/ui/custom-table/CustomTableView';
import type { CustomHTMLTableElement, IVorgabenU, IVorgabenUvorgabenB } from '@/types';
import { default as Storage } from '@/shared/lib/storage/Storage';
import { default as buttonDisable } from '@/shared/ui/button-loading/buttonDisable';
import EditorModalVE from './createEditorModalVE';
import ShowModalVE from './createShowModalVE';
import { apiFetch } from '@/shared/api/apiFetchHelper';

type ProfileTemplateVorgabenBResponse = {
  template?: { VorgabenB?: Array<{ key: string; value: Record<string, unknown> }> };
};

/**
 * Laedt die `VorgabenB` eines Profil-Templates vom Server (`profile-templates/code/<code>`).
 *
 * @param code - Kuerzel des Templates (Erste Taetigkeitsstaette oder `muster`); wird kleingeschrieben abgefragt.
 * @returns Vorgaben des Templates; `null` bei Fehler, fehlendem oder leerem Template.
 */
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

/**
 * Zellen-Parser fuer Ja/Nein-Spalten.
 *
 * @param value - Wahrheitswert der Zelle.
 * @returns `Ja` bei truthy, sonst `Nein`.
 */
const trueParser = (value: unknown): string => (value ? 'Ja' : 'Nein');

/**
 * Zellen-Parser fuer Wochentag/Woche/Zeit-Werte (`{ tag, zeit, Nwoche }`).
 *
 * @param value - Zellwert; `tag` 1-7 (0 und 7 sind Sonntag), `Nwoche` waehlt Woche 2.
 * @param option - `false` trennt mit ` | ` statt Zeilenumbruch.
 * @returns Text wie `Mo W1` plus Trenner und Zeit (`-` ohne Zeit).
 */
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

/**
 * Zellen-Parser der Nachtschicht-Spalten; formatiert wie `weekdayParser`.
 *
 * @param value - Zellwert `{ tag, zeit, Nwoche }`.
 * @param option - `false` trennt mit ` | ` statt Zeilenumbruch.
 * @returns Formatierter Text.
 */
const nachtRangeParser = (value: unknown, option: unknown = true): string => {
  return weekdayParser(value, option);
};

/**
 * Tabelle `#tableVE` (Voreinstellungen Bereitschaft) und Anker ihrer `.instance` (Achse B, `useCustomTableState`).
 * Liegt im Modul ber, weil nur dessen Einstellungen-Abschnitt sie rendert. Die Instanz entsteht nur hier, einmalig beim Mount; `generateEingabeTabelleEinstellungenVorgabenB.ts`
 * findet sie ueber `#tableVE` und laedt nur Zeilen (`rows.load()`).
 */
export default function VorgabenBTable() {
  // Nur beim ersten Mount gelesen: `useCustomTableState()` wertet `options` nur beim ersten Aufruf aus.
  const initialVorgabenB = Storage.check('VorgabenU') ? Storage.get<IVorgabenU>('VorgabenU', true).VorgabenB : {};

  const ftVE = useCustomTableState<IVorgabenUvorgabenB>('tableVE', {
    columns: [
      { name: 'Name', title: 'Name' },
      { name: 'standard', title: 'Standard', longTitle: 'Standard', parser: trueParser, breakpoints: 'sm' },
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
      { name: 'nacht', title: 'Nacht?', parser: trueParser, breakpoints: 'sm' },
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
      /** Oeffnet den Editor fuer eine neue Voreinstellung. */
      addRow: () => {
        EditorModalVE(ftVE, 'Voreinstellung hinzufügen');
      },
      /**
       * Oeffnet den Editor fuer eine bestehende Voreinstellung.
       *
       * @param row - Zu bearbeitende Zeile.
       */
      editRow: row => {
        EditorModalVE(row, 'Voreinstellung bearbeiten');
      },
      /**
       * Zeigt eine Voreinstellung schreibgeschuetzt an.
       *
       * @param row - Anzuzeigende Zeile.
       */
      showRow: row => {
        ShowModalVE(row, 'Voreinstellung anzeigen');
      },
      /**
       * Loescht eine Voreinstellung; der Standard ist nicht loeschbar (Hinweis, erst neuen Standard setzen).
       *
       * @param row - Zu loeschende Zeile.
       */
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
      /** Fragt per Snackbar nach und leert bei "Ja" die Tabelle. */
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
              /** Leert die Tabelle und gibt die per `buttonDisable` gesperrten Knoepfe wieder frei. */
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
          /**
           * Ersetzt die Tabelle durch das Template der Ersten Taetigkeitsstaette (Fallback `muster`, dann
           * `BereitschaftsEinsatzZeiträume`) und speichert die Einstellungen.
           */
          function: async () => {
            const code = Storage.check('VorgabenU')
              ? Storage.get<IVorgabenU>('VorgabenU', true).Pers.ErsteTkgSt.toLowerCase()
              : '';
            let vorgabenB = code ? await fetchTemplateVorgabenB(code) : null;
            if (!vorgabenB) vorgabenB = await fetchTemplateVorgabenB('muster');
            ftVE.rows.load(vorgabenB ?? Object.values(BereitschaftsEinsatzZeiträume));
            invokeHook('pre-save:settings');
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
