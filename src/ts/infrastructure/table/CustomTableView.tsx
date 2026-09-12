import type { MouseEvent, ReactNode } from 'react';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { DBButton, DBTooltip } from '@db-ux/react-core-components';
import type { CustomTable } from './CustomTable';
import type { Column } from './Column';
import type { Row } from './Row';
import type { CustomHTMLTableRowElement, CustomTableTypes, Directions } from './customTableTypes';

/**
 * Phase M0/M1: React-Ersatz fuer `customTableRender.ts` (Vanilla-DOM). `Row`/`Rows`/`Column`
 * bleiben unveraendert reine Datenklassen (kein DOM) -- diese Komponente liest bei jedem
 * `CustomTable.draw()`/`drawRows()`/... nur `table.columns.array`/`table.rows.getFilteredRows()`
 * neu und rendert komplett neu (kein Diffing zwischen Kopf/Zeilen/Fuss noetig, React uebernimmt
 * das). Der `el.instance`-Vertrag (savePipeline/overlapGuard/changeTracking) bleibt unberuehrt:
 * `CustomTable.ts` mountet diese Komponente direkt auf `$el` (das `<table>`-Element selbst,
 * kein Wrapper), React ruehrt nie `$el` selbst an (Klassen/`.instance` bleiben Sache von
 * `CustomTable.ts`).
 *
 * Nicht generisch (arbeitet auf `CustomTableTypes`, dem Laufzeit-Erasure-Typ von `CustomTable`):
 * `CustomTable<T>` selbst ruft diese Komponente aus einer Methode heraus auf, in der `T` nicht
 * mehr als konkreter Typ vorliegt -- exakt der Grund, warum `customTableRender.ts` vorher
 * dieselbe Signatur (`self: CustomTable<T extends CustomTableTypes>` mit `T` nur als
 * Funktions-eigenem Typparameter, nie aus dem Aufrufkontext) nutzte.
 *
 * Button-Markup bewusst als natives `<button class="db-button" data-variant="...">` statt
 * `<DBButton>` gehalten -- exakt das, was `erzeugeDbButtonAusLook` (die bisherige
 * Vanilla-DOM-Bruecke) produzierte, inkl. `dangerouslySetInnerHTML` fuer die konfigurierbaren
 * Icon-Button-Texte (`editText`/`deleteText`/`undoDeleteText`), die als HTML-String im
 * `CustomTableOptions`-Vertrag stehen (immer entwicklerkontrolliert, nie Nutzerdaten).
 */

type AnyTable = CustomTable<CustomTableTypes>;
type AnyColumn = Column<CustomTableTypes>;
type AnyRow = Row<CustomTableTypes>;

/**
 * Reine Datensortierung, portiert unveraendert aus `customTableRender.ts`s `sortRows()`.
 * `renderRows()` sortierte dort bei JEDEM Zeichnen anhand der aktuell als `sorted` markierten
 * Spalte (nicht nur nach einem Klick) -- z. B. `EaTab.tsx`s `Tag`-Spalte startet bereits mit
 * `sorted: true, direction: 'ASC'`.
 */
function sortRows(table: AnyTable, columnIndex: number, direction: Directions | null): void {
  type ValueType = string | number | boolean | object | Dayjs;

  const order = direction === 'DESC' ? [-1, 1] : [1, -1];

  const sorter = (a: AnyRow, b: AnyRow): number => {
    const aColumn = a.columns.array[columnIndex].name;
    const aValue = a.cells[aColumn] as ValueType;
    const bColumn = b.columns.array[columnIndex].name;
    const bValue = b.cells[bColumn] as ValueType;

    const aEmpty = aValue === null || aValue === undefined || aValue === '';
    const bEmpty = bValue === null || bValue === undefined || bValue === '';
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;

    if (dayjs.isDayjs(aValue) && dayjs.isDayjs(bValue)) {
      const diff = aValue.valueOf() - bValue.valueOf();
      if (diff === 0) return 0;
      return diff < 0 ? order[0] : order[1];
    }

    return normalizeValue(bValue).localeCompare(normalizeValue(aValue), undefined, { numeric: true }) * order[1];
  };

  table.rows.array.sort(sorter);

  function normalizeValue(value: ValueType): string {
    switch (typeof value) {
      case 'string':
        return value.toLowerCase();
      case 'number':
      case 'boolean':
        return value.toString();
      case 'object':
        return dayjs.isDayjs(value) ? value.toISOString() : JSON.stringify(value);
      default:
        return String(value);
    }
  }
}

/**
 * Icon-only Zeilen-Aktion (Bearbeiten/Loeschen/Rueckgaengig) -- echte `DBButton`, wie im Rest
 * der App (z. B. `EaTab.tsx`s Hilfe-Knopf, `FahrzeitenPanel.tsx`s Auf/Ab/Loeschen-Knoepfe).
 * `editText`/`deleteText`/`undoDeleteText` aus `CustomTableOptions` (Icon-HTML-Strings der
 * alten Vanilla-DOM-Bruecke) werden hier bewusst NICHT mehr gerendert -- kein Aufrufer
 * ueberschreibt sie, Icon + Tooltip sind deshalb pro Rolle fest.
 */
function editingButton(props: {
  key?: string;
  icon: string;
  tooltip: string;
  color?: 'critical' | 'warning';
  onClick: () => void;
}): ReactNode {
  return (
    <DBButton
      key={props.key}
      type="button"
      variant="outlined"
      data-color={props.color}
      size="small"
      icon={props.icon}
      noText
      aria-label={props.tooltip}
      onClick={event => {
        event.stopPropagation();
        event.preventDefault();
        props.onClick();
      }}
    >
      <DBTooltip>{props.tooltip}</DBTooltip>
    </DBButton>
  );
}

/**
 * Toggelt die Sortierung auf `column` (aus einem Klick-Handler heraus, nicht in der
 * Render-Funktion einer Komponente) -- absichtlich eine eigenstaendige Funktion statt einer
 * Closure in `HeaderCell`: `column`/`table` sind veraenderliche Fachobjekte (siehe `Row`/`Rows`),
 * keine React-Props im ueblichen Sinn; als Komponenten-Closure markiert der
 * `react-hooks/immutability`-Linter das faelschlich als Props-Mutation.
 */
function toggleColumnSort(table: AnyTable, column: AnyColumn): void {
  const direction = column.direction === 'ASC' ? 'DESC' : 'ASC';
  table.columns.array.forEach(c => {
    c.sorted = false;
    c.direction = null;
  });
  column.sorted = true;
  column.direction = direction;
  table.draw();
}

function HeaderCell({ table, column }: { table: AnyTable; column: AnyColumn }): ReactNode {
  const sortable = Boolean(table.state.sorting) && column.sortable;
  const classes = [...column.classes.filter(c => c !== 'customtable-editing')];
  if (sortable) classes.push('customtable-sortable');
  if (column.sorted) classes.push(column.direction === 'DESC' ? 'customtable-desc' : 'customtable-asc');

  const icon = !column.sorted ? 'arrows_vertical' : column.direction === 'DESC' ? 'arrow_down' : 'arrow_up';
  const iconStateClass = !column.sorted
    ? 'customtable-sort'
    : column.direction === 'DESC'
      ? 'customtable-sort-desc'
      : 'customtable-sort-asc';

  return (
    <th
      className={classes.length > 0 ? classes.join(' ') : undefined}
      data-breakpoints={column.breakpoints ?? undefined}
      onClick={sortable ? () => toggleColumnSort(table, column) : undefined}
    >
      {column.title}
      {sortable && (
        <span
          className={`customtableIcon db-icon db-font-size-sm ${iconStateClass}`}
          aria-hidden="true"
          data-icon={icon}
        />
      )}
    </th>
  );
}

function BodyRow({ table, row }: { table: AnyTable; row: AnyRow }): ReactNode {
  const columns = row.columns.array.filter(c => c.visible);
  const classes = [row.isDeleted && 'customtable-deleted', row.isError && 'customtable-error'].filter(Boolean);
  const errorMessage = row.isError ? row._errorMessage : null;

  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>): void => {
    if (row.isDeleted) return;
    if (((event.view as unknown as Window | null)?.innerWidth ?? 0) > table.maxBreakpoint()) return;
    event.stopPropagation();
    table.options.editing.showRow(row);
  };

  return (
    <tr
      // `tr.data = row` ist ein externer Vertrag (nicht nur Render-internes Bookkeeping!):
      // `attachBerechnenToggleListeners.ts` (EWT, `afterDrawRows`-Hook) liest
      // `checkbox.closest('tr')?.data`, um die zugehoerige `Row`-Instanz zu finden.
      ref={(el: CustomHTMLTableRowElement<CustomTableTypes> | null) => {
        if (el) el.data = row;
      }}
      className={classes.length > 0 ? classes.join(' ') : undefined}
      data-error-message={errorMessage ?? undefined}
      title={errorMessage ?? undefined}
      aria-label={errorMessage ? `Fehler: ${errorMessage}` : undefined}
      onClick={handleRowClick}
    >
      {columns.map((column, columnIndex) => {
        // Fehler-Icon nur an der ersten (sichtbaren) Zelle -- entspricht dem alten
        // `errorIconRendered`-Merker in `customTableRender.ts`, hier ohne Mutation waehrend
        // des Renderns: die erste Spalte hat immer Index 0.
        const showErrorIcon = Boolean(errorMessage) && columnIndex === 0;

        const cellClasses = [...column.classes];
        const tdClassName = cellClasses.length > 0 ? cellClasses.join(' ') : undefined;
        const cellValue = row.cells[column.name];

        return (
          <td key={column.name} data-breakpoints={column.breakpoints ?? undefined} className={tdClassName}>
            {errorMessage && (
              <i role="tooltip" className="db-tooltip" data-placement="top">
                {errorMessage}
              </i>
            )}
            {showErrorIcon && (
              <span
                className="db-icon db-font-size-sm customtable-error-icon"
                aria-hidden="true"
                data-icon="exclamation_mark_circle"
              />
            )}
            {column.editing ? (
              <div className="knopfgruppe" role="group">
                {row.isDeleted
                  ? editingButton({
                      icon: 'undo',
                      tooltip: 'Rückgängig',
                      color: 'warning',
                      onClick: () => row.undoDelete(),
                    })
                  : [
                      editingButton({
                        key: 'edit',
                        icon: 'pen',
                        tooltip: 'Bearbeiten',
                        onClick: () => table.options.editing.editRow(row),
                      }),
                      editingButton({
                        key: 'delete',
                        icon: 'bin',
                        tooltip: 'Löschen',
                        color: 'critical',
                        onClick: () => table.options.editing.deleteRow(row),
                      }),
                    ]}
              </div>
            ) : (
              // `html: true`-Spalten liefern JSX direkt (kein `dangerouslySetInnerHTML` mehr
              // noetig, seit `Column.parser` `ReactNode` zurueckgeben darf, siehe
              // `customTableTypes.ts`); alle anderen werden wie bisher zu Text stringifiziert.
              <span>
                {column.html
                  ? // `parser` ist auf `string | number` typisiert (gilt fuer praktisch alle
                    // Spalten), `html: true`-Spalten sind der dokumentierte Ausnahmefall und
                    // geben tatsaechlich JSX zurueck (siehe `EwtTab.tsx`s `schichtParser`/
                    // `berechnenParser`) -- Cast bewusst hier lokalisiert, nicht im
                    // Spalten-Vertrag selbst (der bleibt fuer alle anderen Aufrufer unveraendert).
                    (column.parser(cellValue) as unknown as ReactNode)
                  : String(column.parser(cellValue))}
              </span>
            )}
          </td>
        );
      })}
    </tr>
  );
}

function rowKey(row: AnyRow): string {
  return row._id ?? row._clientRequestId ?? String(row.CustomTable.rows.array.indexOf(row));
}

export default function CustomTableView({ table }: { table: AnyTable }): ReactNode {
  const columns = table.columns.array.filter(c => c.visible);

  // Mutiert `table.rows.array` waehrend des Renderns -- unrein, aber idempotent (sortiert
  // eine bereits sortierte Liste erneut identisch) und exakt das bisherige Verhalten von
  // `customTableRender.ts`s `renderRows()`, das ebenfalls bei jedem Zeichnen sortierte.
  const sortedColumn = table.columns.array.find(c => c.sorted);
  if (sortedColumn) sortRows(table, sortedColumn.index, sortedColumn.direction);

  const rows = table.rows.getFilteredRows();

  return (
    <>
      <thead style={rows.length > 0 ? undefined : { display: 'none' }}>
        <tr className="customtable-header" data-sub-header-emphasis="weak">
          {columns.map(column => (
            <HeaderCell key={column.name} table={table} column={column} />
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length > 0 ? (
          rows.map(row => <BodyRow key={rowKey(row)} table={table} row={row} />)
        ) : (
          <tr className="customtable-empty">
            <td colSpan={columns.length + 1}>
              {typeof table.options.empty === 'function' ? table.options.empty() : table.options.empty}
            </td>
          </tr>
        )}
      </tbody>
      {table.state.editing && (
        <tfoot>
          <tr className="customtable-editing">
            <td colSpan={columns.length + 1}>
              <div className="d-flex flex-wrap gap-2 justify-content-center justify-content-sm-evenly">
                <DBButton
                  type="button"
                  variant="brand"
                  icon="plus"
                  onClick={event => {
                    event.stopPropagation();
                    event.preventDefault();
                    table.options.editing.addRow();
                  }}
                >
                  {table.options.editing.addText}
                </DBButton>
                {table.options.editing.customButton?.map((btn, i) => (
                  <DBButton
                    key={i}
                    type="button"
                    variant={btn.look?.variant ?? 'filled'}
                    data-color={btn.look?.color}
                    size={btn.look?.size}
                    onClick={event => {
                      event.stopPropagation();
                      event.preventDefault();
                      btn.function();
                    }}
                  >
                    {btn.text}
                  </DBButton>
                ))}
                <DBButton
                  type="button"
                  className="customtable-delete-all"
                  variant="outlined"
                  data-color="critical"
                  icon="bin"
                  style={rows.length > 0 ? undefined : { display: 'none' }}
                  onClick={event => {
                    event.stopPropagation();
                    event.preventDefault();
                    table.options.editing.deleteAllRows();
                  }}
                >
                  {table.options.editing.deleteAllText}
                </DBButton>
              </div>
            </td>
          </tr>
        </tfoot>
      )}
    </>
  );
}
