import type { MouseEvent, ReactNode } from 'react';
import { useEffect } from 'react';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { DBButton, DBStack, DBTooltip } from '@db-ux/react-core-components';
import type { CustomTable } from './CustomTable';
import type { Column } from './Column';
import type { Row } from './Row';
import type { CustomHTMLTableRowElement, CustomTableTypes, Directions } from './customTableTypes';

type AnyTable = CustomTable<CustomTableTypes>;
type AnyColumn = Column<CustomTableTypes>;
type AnyRow = Row<CustomTableTypes>;

/**
 * Sortiert `table.rows.array` in place nach der Spalte `columnIndex`: leere Werte (`null`,
 * `undefined`, `''`) stets ans Ende, Dayjs-Werte nach Zeit, sonst natuerlich (numerisch) und
 * ohne Beachtung der Gross-/Kleinschreibung. Laeuft bei jedem Render fuer die als `sorted`
 * markierte Spalte, nicht nur nach einem Klick -- z. B. startet die `Tag`-Spalte in `EaTab.tsx`
 * mit `sorted: true, direction: 'ASC'`.
 *
 * @param table - Tabelle, deren Zeilen sortiert werden.
 * @param columnIndex - Index der Sortierspalte in `columns.array`.
 * @param direction - `'DESC'` absteigend, sonst aufsteigend.
 */
function sortRows(table: AnyTable, columnIndex: number, direction: Directions | null): void {
  type ValueType = string | number | boolean | object | Dayjs;

  const order = direction === 'DESC' ? [-1, 1] : [1, -1];

  /**
   * Vergleichsfunktion fuer `Array.prototype.sort` nach der Sortierspalte und `direction`.
   *
   * @param a - Erste Zeile.
   * @param b - Zweite Zeile.
   * @returns Negativ, `0` oder positiv wie bei `sort`; leere Werte sortieren immer nach hinten.
   */
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

  /**
   * Macht einen Zellwert vergleichbar: Strings kleingeschrieben, Dayjs als ISO-String, Objekte als JSON.
   *
   * @param value - Zellwert.
   * @returns Vergleichs-String.
   */
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
 * Icon-only Zeilen-Aktion (Bearbeiten/Loeschen/Rueckgaengig) als `DBButton`. Icon und Tooltip sind
 * pro Rolle fest; `editText`/`deleteText`/`undoDeleteText` aus `CustomTableOptions` werden nicht
 * gerendert, weil kein Aufrufer sie ueberschreibt. Der Klick wird nicht an die Zeile weitergereicht.
 *
 * @param props - `key` (React-Key bei Listen), `icon`, `tooltip` (auch `aria-label`), optionale
 *   `color` und der Klick-Handler `onClick`.
 * @returns Der Button.
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
      size="medium"
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
 * Toggelt die Sortierung auf `column` und zeichnet die Tabelle neu. Aus einem Klick-Handler
 * aufgerufen, nicht in der Render-Funktion einer Komponente. Dispatcht `TOGGLE_COLUMN_SORT`
 * (siehe `tableReducer.ts`), weil `Column` ein reines Lese-Objekt ohne Setter ist (siehe `Column.ts`).
 *
 * @param table - Tabelle der Spalte.
 * @param column - Spalte, deren Sortierung umgeschaltet wird.
 */
function toggleColumnSort(table: AnyTable, column: AnyColumn): void {
  table.dispatch({ type: 'TOGGLE_COLUMN_SORT', columnName: column.name });
  table.draw();
}

/**
 * Kopfzelle einer Spalte; sortierbare Spalten (Tabelle sortierbar und `column.sortable`) tragen
 * Sortier-Icon und Klick-Handler.
 *
 * @param props - `table` und die darzustellende `column`.
 */
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

/**
 * Tabellenzeile mit Zellen der sichtbaren Spalten, Fehlerhinweis und Zeilen-Aktionen.
 *
 * @param props - `table` und die darzustellende `row`.
 */
function BodyRow({ table, row }: { table: AnyTable; row: AnyRow }): ReactNode {
  const columns = row.columns.array.filter(c => c.visible);
  const classes = [row.isDeleted && 'customtable-deleted', row.isError && 'customtable-error'].filter(Boolean);
  const errorMessage = row.isError ? row._errorMessage : null;

  /**
   * Oeffnet die Zeilenansicht, wenn die Fensterbreite nicht ueber dem groessten Breakpoint der
   * Tabelle liegt (Kartenansicht); geloeschte Zeilen ignoriert sie.
   *
   * @param event - Klick auf die Zeile.
   */
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
        // Fehler-Icon nur an der ersten sichtbaren Zelle (Index 0).
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
              <DBStack direction="row" wrap={false} gap="2x-small" role="group">
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
              </DBStack>
            ) : (
              // `html: true`-Spalten liefern JSX direkt (siehe `customTableTypes.ts`), alle
              // anderen werden zu Text stringifiziert.
              <span>
                {column.html
                  ? // `parser` ist auf `string | number` typisiert; `html: true`-Spalten geben
                    // tatsaechlich JSX zurueck (siehe `schichtParser`/`berechnenParser` in
                    // `EwtTab.tsx`). Der Cast bleibt hier lokal, der Spalten-Vertrag unveraendert.
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

/**
 * React-Key einer Zeile: Server-Id, sonst Client-Request-Id, sonst Position in `rows.array`.
 *
 * @param row - Zeile.
 * @returns Key-String.
 */
function rowKey(row: AnyRow): string {
  return row._id ?? row._clientRequestId ?? String(row.CustomTable.rows.array.indexOf(row));
}

/**
 * Rendert Kopf, Zeilen und Fuss einer `CustomTable` als `<thead>`/`<tbody>`/`<tfoot>` in ein
 * umgebendes `<table>`. Achse B: Tab-Komponenten setzen sie in JSX ein; Achse A: `CustomTable.render()`
 * mountet sie auf `$el` (dem `<table>` selbst, React beruehrt dessen Klassen und `.instance` nie).
 * `Row`/`Rows`/`Column` bleiben reine Datenklassen; gelesen wird bei jedem Render neu.
 *
 * Nicht generisch: arbeitet auf `CustomTableTypes` (Laufzeit-Erasure-Typ), weil `CustomTable<T>` sie
 * aus einer Methode ohne konkretes `T` aufruft. Zeilen-Aktionen siehe `editingButton()`.
 *
 * @param props - `table`: die darzustellende Tabelle.
 */
export default function CustomTableView({ table }: { table: AnyTable }): ReactNode {
  const columns = table.columns.array.filter(c => c.visible);

  // Mutiert `table.rows.array` waehrend des Renderns -- unrein, aber idempotent (eine bereits
  // sortierte Liste bleibt beim erneuten Sortieren identisch).
  const sortedColumn = table.columns.array.find(c => c.sorted);
  if (sortedColumn) sortRows(table, sortedColumn.index, sortedColumn.direction);

  const rows = table.rows.getFilteredRows();
  const state = table.getState();

  // Achse B (`useCustomTableState()`): `CustomTable.draw()`/`render()` sind dort No-Ops (React
  // rendert selbst) -- die `customFunction`-Hooks (aktuell nur `afterDrawRows:
  // attachBerechnenToggleListeners` in `EwtTab.tsx`) muessen deshalb hier nach jedem Commit
  // ausgeloest werden. In Achse A feuert `render()` sie selbst rund um `mount()`.
  useEffect(() => {
    if (!table.isReactManaged()) return;
    const hooks = table.options.customFunction;
    hooks?.beforeDrawHeader?.call(table);
    hooks?.beforeDrawFooter?.call(table);
    hooks?.beforeDrawRows?.call(table);
    hooks?.afterDrawHeader?.call(table);
    hooks?.afterDrawFooter?.call(table);
    hooks?.afterDrawRows?.call(table);
    // `table` ist stabil (`useRef` in `useCustomTableState()`); `state` steht hier fuer
    // "irgendetwas hat sich geaendert", nicht fuer einen echten Datenfluss.
  }, [state, table]);

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
