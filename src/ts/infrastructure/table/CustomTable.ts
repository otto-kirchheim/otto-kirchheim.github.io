/*!
 * Customtable
 *
 * Copyright 2022-2026 Jan Otto
 */
import { createElement, useReducer, useRef } from 'react';
import './customtable.scss';
import type { CustomHTMLTableElement } from '@/types';
import { flushExtern, mount } from '@/infrastructure/ui/reactRoot';
import { BREAKPOINTS } from '@/infrastructure/ui/breakpoints';
import { Column, Columns } from './Column';
import CustomTableView from './CustomTableView';
import type {
  Breakpoints,
  ColumnRecord,
  CustomTableOptions,
  CustomTableOptionsAll,
  CustomTableTypes,
  RowRecord,
  RowState,
  TableAction,
  TableChanges,
  TableReducerState,
} from './customTableTypes';
import { Row } from './Row';
import { Rows } from './Rows';
import { getRowKey } from './customTableTypes';
import { createRowRecord, tableReducer } from './tableReducer';

export { Column, Columns, Row, Rows, getRowKey };
export type { CustomTableTypes, RowState, TableChanges };

export class CustomTable<T extends CustomTableTypes = CustomTableTypes> {
  public $el: CustomHTMLTableElement<T> | null;
  public table: string;
  public rows: Rows<T>;
  public columns: Columns<T>;
  public state: { editing: boolean | null; sorting: boolean | null };
  private readonly o = { breakpoints: BREAKPOINTS };
  public options: CustomTableOptionsAll<T>;
  private tableState: TableReducerState<T>;
  /**
   * Nur gesetzt, wenn die Instanz per `useCustomTableState()` (Achse B) an einen echten
   * React-`useReducer` gebunden ist -- dann rendert die Tab-Komponente selbst per JSX,
   * `draw()`/`drawRows()`/... werden No-Ops und `dispatch()` routet ueber `flushExtern` in den
   * echten Hook-`dispatch`. `null` = Achse-A-Betrieb (`createCustomTable()`, u.a. alle Tests
   * und andere DOM-lose Verwendungen): die Instanz rendert sich weiterhin selbst per `mount()`.
   */
  private reactDispatch: ((action: TableAction<T>) => void) | null = null;

  private constructor(elementId: string, el: CustomHTMLTableElement<T> | null, options: CustomTableOptions<T>) {
    this.table = elementId;
    this.$el = el;
    this.options = ApplyOptions.bind(this)(options);
    this.state = setState.bind(this)();

    if (this.$el) {
      this.$el.instance = this;
      this.$el.classList.add(...['customtable', ...this.options.classes]);
    }

    if (this.state.editing) {
      const editingRow: CustomTableOptionsAll<T>['columns'][0] = {
        name: 'editing',
        title: '',
        type: 'editing',
        longTitle: '',
        breakpoints: null,
        sortable: false,
        editing: this.options.editing,
        classes: ['customtable-editing'],
        visible: true,
        html: false,
        sorted: false,
        direction: null,
        parser: _parser,
      };
      const maxBreakpoint = this.maxBreakpoint(this.options.columns);
      if (Object.values(this.o.breakpoints).includes(maxBreakpoint)) {
        const index = Object.values(this.o.breakpoints).indexOf(maxBreakpoint);
        if (typeof index === 'number') {
          const breakpoint = Object.keys(this.o.breakpoints)[index];
          editingRow.classes.push(`customtable-toggle-${breakpoint}`);
        }
      }
      this.options.columns.unshift(editingRow);
    }

    const initialColumns: ColumnRecord<T>[] = this.options.columns.map(column => ({ ...column }));
    this.tableState = {
      rows: this.options.rows.map(row => createRowRecord(row, 'unchanged')),
      columns: initialColumns,
      rowFilter: null,
      editingEnabled: this.state.editing,
      sortingEnabled: this.state.sorting,
    };
    this.columns = new Columns(this);
    this.rows = new Rows<T>(this);

    if (this.$el) this.draw();

    return this;

    /** It takes an object as an argument and returns an object with the same properties as the argument,
     * but with default values for the properties that are not defined in the argument */
    function ApplyOptions(this: CustomTable<T>, options: CustomTableOptions<T>): CustomTableOptionsAll<T> {
      if (!options.columns) throw new Error('Spalten fehlen');
      return {
        columns: options.columns.map(column => {
          if (!column.name) throw new Error('Spalten Name fehlt');
          return {
            name: column.name,
            title: column.title ?? '',
            longTitle: column.longTitle ?? column.title ?? '',
            breakpoints: column.breakpoints ?? null,
            sortable: column.sortable ?? false,
            sorted: column.sorted ?? false,
            direction: column.direction ?? null,
            type: column.type ?? 'text',
            parser: column.parser ?? _parser,
            classes: column.classes ?? [],
            visible: column.visible ?? true,
            html: column.html ?? false,
          };
        }),
        rows: options.rows ?? [],
        empty: options.empty ?? 'Keine Daten gefunden',
        sorting: {
          enabled: options.sorting?.enabled ?? false,
        },
        editing: {
          enabled: options.editing?.enabled ?? false,
          addText: options.editing?.addText ?? 'Neue Zeile',
          editText:
            options.editing?.editText ??
            '<span class="db-icon db-font-size-sm" data-icon="pen" aria-hidden="true"></span>',
          deleteText:
            options.editing?.deleteText ??
            '<span class="db-icon db-font-size-sm" data-icon="bin" aria-hidden="true"></span>',
          deleteAllText: options.editing?.deleteAllText ?? 'Alle Zeilen löschen',
          addRow:
            options.editing?.addRow ??
            function () {
              return;
            },
          editRow:
            options.editing?.editRow ??
            function () {
              return;
            },
          showRow:
            options.editing?.showRow ??
            function () {
              return;
            },
          deleteRow:
            options.editing?.deleteRow ??
            function () {
              return;
            },
          deleteAllRows: options.editing?.deleteAllRows ?? this.deleteAllRows,
          undoDeleteText:
            options.editing?.undoDeleteText ??
            '<span class="db-icon db-font-size-sm" data-icon="undo" aria-hidden="true"></span>',
          customButton: options.editing?.customButton ?? null,
        },
        classes: options.classes ?? [],
        onChange: options.onChange ?? null,
        customFunction: options.customFunction ?? null,
      };
    }

    function _parser(this: Column<T>, value: unknown): string {
      const s = typeof value === 'number' ? value.toString() : ((value as string) ?? '');
      switch (this.type) {
        case 'text':
        case 'number':
          return s;
        case 'time':
          return s.length > 0 ? s : '--:--';
        default:
          return s;
      }
    }

    /**
     * If the sorting property of the options object is truthy, then return the value of the sorting
     * property of the options object, otherwise return null.
     * @returns The return value is an object with two properties: sorting and editing.
     */
    function setState(this: CustomTable<T>): { sorting: boolean | null; editing: boolean | null } {
      return {
        sorting: this.options.sorting?.enabled ?? null,
        editing: this.options.editing?.enabled ?? null,
      };
    }
  }

  /** Konstruiert eine Instanz gegen ein bereits im DOM vorhandenes `<table>` (Achse A: Tests, sonstige DOM-Verwendungen). */
  static fromElement<T extends CustomTableTypes>(
    initTable: string | CustomHTMLTableElement<T>,
    options: CustomTableOptions<T>,
  ): CustomTable<T> {
    let elementId: string;
    let el: CustomHTMLTableElement<T>;
    if (typeof initTable === 'string') {
      elementId = initTable;
      const found = document.querySelector<CustomHTMLTableElement<T>>(`#${initTable}`);
      if (!found) throw new Error('Tabelle nicht gefunden');
      el = found;
    } else if (initTable instanceof HTMLTableElement) {
      elementId = initTable.id;
      el = initTable;
    } else throw new Error('Tabellen Fehler');
    return new CustomTable<T>(elementId, el, options);
  }

  /** Konstruiert eine Instanz ohne DOM-Element (Achse B: `useCustomTableState()`, siehe dort -- das `<table>` existiert beim ersten Render noch nicht, wird per Ref-Callback nachgetragen). */
  static forHook<T extends CustomTableTypes>(elementId: string, options: CustomTableOptions<T>): CustomTable<T> {
    return new CustomTable<T>(elementId, null, options);
  }

  /**
   * Bindet Achse-B-Laufzeitwerte (siehe Klassendoc oben) -- von `useCustomTableState()` bei
   * jedem Render der Tab-Komponente erneut aufgerufen, haelt `tableState`/`reactDispatch`
   * aktuell.
   */
  public attachRuntime(state: TableReducerState<T>, dispatch: (action: TableAction<T>) => void): void {
    this.tableState = state;
    this.reactDispatch = dispatch;
  }

  /** Ref-Callback-Ziel der Tab-Komponente (Achse B): traegt das inzwischen gemountete `<table>`-Element nach. */
  public attachElement(el: CustomHTMLTableElement<T>): void {
    this.$el = el;
    el.instance = this;
    el.classList.add('customtable', ...this.options.classes);
  }

  /** Liest den aktuellen Reducer-State (siehe `tableReducer.ts`). */
  public getState(): TableReducerState<T> {
    return this.tableState;
  }

  /**
   * Achse B (`useCustomTableState()`) aktiv? `CustomTableView.tsx` nutzt das, um die
   * `customFunction`-Hooks nur einmal auszuloesen -- in Achse A feuert bereits `render()`
   * selbst rund um `mount()`, ein zusaetzlicher `useEffect`-Aufruf dort waere doppelt.
   */
  public isReactManaged(): boolean {
    return this.reactDispatch !== null;
  }

  /**
   * Wendet `action` auf den Reducer-State an. Achse A (kein `attachRuntime()`-Aufruf seit
   * Konstruktion): simple synchrone Zuweisung. Achse B: routet ueber `flushExtern`
   * (`reactRoot.ts`) in den echten `useReducer`-`dispatch` -- React batcht/verzoegert Updates
   * sonst, externe Aufrufer (die 14 `.instance`-Dateien) lesen direkt nach dem Aufruf aber den
   * neuen Wert (siehe `Row.ts`s Docblock).
   */
  public dispatch(action: TableAction<T>): void {
    if (this.reactDispatch) {
      const reactDispatch = this.reactDispatch;
      flushExtern(() => reactDispatch(action));
    } else {
      this.tableState = tableReducer(this.tableState, action);
    }
  }

  /** Sucht den `RowRecord` einer `uid` im aktuellen State (für den `Row`-Shim). */
  public getRowRecord(uid: string): RowRecord<T> | undefined {
    return this.tableState.rows.find(row => row.uid === uid);
  }

  /**
   * It returns an array of the rows in the table.
   * @returns {object[]} An array of rows.
   */
  public getRows(): Row<T>[] {
    return this.rows.array;
  }

  /**
   * It returns an array of arrays, where each inner array is an array of the values of the cells of a
   * row
   * @returns An array of arrays.
   */
  public getArray<T>(): T[] {
    return this.rows.array.map(row => Object.values(row.cells) as T);
  }

  /**
   * It creates all elements for the table. Achse B (`reactDispatch` gesetzt): No-Op -- React
   * rendert bereits automatisch bei jeder Zustandsaenderung, `draw()` existiert nur noch fuer
   * die 14 externen Aufrufer, die es nach eigenen Mutationen aufrufen (siehe `Row.ts`s Docblock).
   */
  public draw(): void {
    if (this.reactDispatch) return;
    if (this.options.customFunction?.beforeDraw) this.options.customFunction.beforeDraw.call(this);
    this.render();
    if (this.options.customFunction?.afterDraw) this.options.customFunction.afterDraw.call(this);
  }

  /**
   * It creates a footer for the table
   */
  public drawFooter(): void {
    if (!this.reactDispatch) this.render();
  }

  /**
   * It draws the rows of the table
   */
  public drawRows(): void {
    if (!this.reactDispatch) this.render();
  }

  /**
   * It draws the header of the table
   */
  public drawHeader(): void {
    if (!this.reactDispatch) this.render();
  }

  /**
   * Rendert Kopf/Zeilen/Fuss in einem Zug neu (React-Ersatz fuer `customTableRender.ts`,
   * NUR fuer Achse A -- Achse B rendert per JSX, siehe `draw()`).
   * `Row`/`Rows` unterscheiden nicht, welche `draw*()`-Methode eine Aenderung ausloest --
   * alle vier Einstiegspunkte rendern deshalb identisch komplett neu; React uebernimmt das
   * Diffing. `mount()` ist per `flushSync` synchron (siehe `reactRoot.ts`), der Aufrufer sieht
   * danach garantiert das aktualisierte DOM -- exakt der bisherige synchrone Vertrag.
   */
  private render(): void {
    if (!this.$el) return;
    const hooks = this.options.customFunction;
    if (hooks?.beforeDrawHeader) hooks.beforeDrawHeader.call(this);
    if (hooks?.beforeDrawFooter) hooks.beforeDrawFooter.call(this);
    if (hooks?.beforeDrawRows) hooks.beforeDrawRows.call(this);

    mount(this.$el, createElement(CustomTableView, { table: this as CustomTable<CustomTableTypes> }));

    if (hooks?.afterDrawHeader) hooks.afterDrawHeader.call(this);
    if (hooks?.afterDrawFooter) hooks.afterDrawFooter.call(this);
    if (hooks?.afterDrawRows) hooks.afterDrawRows.call(this);
  }

  /** Benachrichtigt den onChange-Callback (für Auto-Save-Integration) */
  public _notifyChange(): void {
    if (this.options.onChange) this.options.onChange(this);
  }

  /**
   * Default-Fallback für `options.editing.deleteAllRows`, sofern eine Tabelle keinen eigenen
   * liefert -- alle 6 produktiven Tabellen tun das (siehe `*Tab.tsx`), dieser Zweig ist damit
   * praktisch unerreicht. Delegiert an `rows.deleteAll()` (Soft-Delete) statt eines rohen
   * Array-Clears, den der Reducer-State-Zugriff (`rows.array` ist ein Getter) ohnehin nicht
   * mehr zulässt.
   */
  private deleteAllRows(): void {
    this.rows.deleteAll();
  }

  /**
   * It takes an array of objects, and returns an array of unique values from the "breakpoints" property
   * of each object.
   * @param {} array - The array of columns to get the breakpoints from. If not provided, it will use the
   * columns.array property.
   * @returns {string[]} An array of unique breakpoints.
   */
  public breakpoints(array: Column<T>[] | CustomTableOptionsAll<T>['columns']): Breakpoints[] | [] {
    if (!array) array = this.columns.array;
    return <Breakpoints[] | []>(
      Array.from(new Set(array.map(column => column.breakpoints).flatMap(f => (f ? f.split(' ') : []))))
    );
  }

  /** It returns the largest breakpoint value from an array of breakpoint names */
  public maxBreakpoint(array: Column<T>[] | CustomTableOptionsAll<T>['columns'] = this.columns.array): number {
    return Math.max(...this.breakpoints(array).map(breakpoint => this.o.breakpoints[breakpoint]));
  }
}

export function createCustomTable<T extends CustomTableTypes>(
  table: string | CustomHTMLTableElement<T>,
  options: CustomTableOptions<T>,
): CustomTable<T> {
  return CustomTable.fromElement<T>(table, options);
}

/**
 * Achse B des `useReducer`-Umbaus: ersetzt `createCustomTable()` in einer Tab-Komponente.
 * Konstruiert die `CustomTable`-Shim-Instanz genau einmal (`useRef`, `options` wird nur beim
 * allerersten Aufruf gelesen -- exakt das bisherige `useEffect(() => {...}, [])`-Verhalten,
 * nur ohne Effekt) und bindet sie an einen echten `useReducer`. Die Tab-Komponente rendert
 * `<CustomTableView table={...} />` direkt als JSX-Kind; das `<table>`-Element traegt einen
 * `ref`-Callback, der `instance.attachElement(el)` aufruft (das Element existiert beim ersten
 * Render dieser Funktion noch nicht).
 */
export function useCustomTableState<T extends CustomTableTypes>(
  elementId: string,
  options: CustomTableOptions<T>,
): CustomTable<T> {
  const instanceRef = useRef<CustomTable<T> | null>(null);
  if (!instanceRef.current) instanceRef.current = CustomTable.forHook<T>(elementId, options);
  const instance = instanceRef.current;

  const [state, dispatch] = useReducer(tableReducer, instance.getState());
  instance.attachRuntime(state, dispatch);

  return instance;
}

/**
 * `CustomTableView` ist absichtlich nicht generisch (siehe Docblock dort) -- eine Tab-
 * Komponente, die `<CustomTableView table={ftN} />` direkt als JSX-Kind rendert (Achse B),
 * braucht deshalb an dieser einen Stelle einen Cast auf den Laufzeit-Erasure-Typ. Zentral
 * hier statt an 6 Call-Sites wiederholt.
 */
export function asAnyTable<T extends CustomTableTypes>(table: CustomTable<T>): CustomTable<CustomTableTypes> {
  return table as unknown as CustomTable<CustomTableTypes>;
}
