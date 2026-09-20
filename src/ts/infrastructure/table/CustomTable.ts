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

/**
 * Datenmodell einer Tabelle (Zeilen, Spalten, Optionen) samt Rendering-Anbindung. Läuft in zwei
 * Betriebsarten: Achse A (`createCustomTable()`, rendert sich per `mount()` selbst) und Achse B
 * (`useCustomTableState()`, die Tab-Komponente rendert per JSX).
 * @typeParam T - Zeilentyp der Tabelle.
 */
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
   * Nur gesetzt, wenn die Instanz per `useCustomTableState()` (Achse B) an einen `useReducer` gebunden
   * ist: die Tab-Komponente rendert per JSX, `draw()`/`drawRows()`/... sind No-Ops, `dispatch()` routet
   * über `flushExtern` in den Hook-`dispatch`. `null` = Achse A (`createCustomTable()`, u.a. Tests): die
   * Instanz rendert sich per `mount()` selbst.
   */
  private reactDispatch: ((action: TableAction<T>) => void) | null = null;

  /**
   * Baut Optionen, Spalten und Reducer-State auf und ergänzt bei aktivem Editieren die
   * `editing`-Spalte samt Toggle-Klasse des größten Breakpoints. Nur über `fromElement()` bzw.
   * `forHook()` erreichbar.
   * @param elementId - Id des `<table>`-Elements.
   * @param el - Das `<table>`, oder `null` (Achse B: kommt später per `attachElement()`).
   * @param options - Konfiguration der Tabelle (Defaults ergänzt `ApplyOptions`).
   * @throws {Error} Wenn `options.columns` fehlt oder eine Spalte keinen `name` hat.
   */
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

    /**
     * Ergänzt Defaults für nicht gesetzte Optionen.
     * @param options - Die vom Aufrufer übergebenen Optionen.
     * @returns Vollständige Optionen ohne fehlende Felder.
     * @throws {Error} Wenn `columns` fehlt oder eine Spalte keinen `name` hat.
     */
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

    /**
     * Standard-Parser einer Spalte: wandelt einen Zellwert in Anzeigetext. Leere Zeit-Zellen
     * erscheinen als `--:--`.
     * @param value - Rohwert der Zelle (Zahl, String oder leer).
     * @returns Anzeigetext der Zelle.
     */
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
     * Ausgangszustand von Sortierung und Bearbeitung aus den Optionen.
     * @returns `sorting`/`editing` je als Flag, `null` = nicht konfiguriert.
     */
    function setState(this: CustomTable<T>): { sorting: boolean | null; editing: boolean | null } {
      return {
        sorting: this.options.sorting?.enabled ?? null,
        editing: this.options.editing?.enabled ?? null,
      };
    }
  }

  /**
   * Konstruiert eine Instanz gegen ein vorhandenes `<table>` (Achse A: Tests, DOM-Verwendungen).
   * @param initTable - Id oder Element der Tabelle.
   * @param options - Konfiguration der Tabelle.
   * @returns Die neue Instanz.
   * @throws {Error} Wenn die Id kein Element trifft oder `initTable` weder String noch `<table>` ist.
   */
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

  /**
   * Konstruiert eine Instanz ohne DOM-Element (Achse B): das `<table>` wird per Ref-Callback
   * nachgetragen (`attachElement()`).
   * @param elementId - Id des späteren `<table>`-Elements.
   * @param options - Konfiguration der Tabelle.
   * @returns Die neue Instanz.
   */
  static forHook<T extends CustomTableTypes>(elementId: string, options: CustomTableOptions<T>): CustomTable<T> {
    return new CustomTable<T>(elementId, null, options);
  }

  /**
   * Bindet die Achse-B-Laufzeitwerte; `useCustomTableState()` ruft das bei jedem Render auf, damit
   * `tableState`/`reactDispatch` aktuell bleiben.
   * @param state - Aktueller State des `useReducer`.
   * @param dispatch - `dispatch` des `useReducer`.
   */
  public attachRuntime(state: TableReducerState<T>, dispatch: (action: TableAction<T>) => void): void {
    this.tableState = state;
    this.reactDispatch = dispatch;
  }

  /**
   * Ref-Callback-Ziel der Tab-Komponente (Achse B): trägt das gemountete `<table>` nach und setzt
   * die Tabellen-Klassen.
   * @param el - Das gemountete `<table>`-Element.
   */
  public attachElement(el: CustomHTMLTableElement<T>): void {
    this.$el = el;
    el.instance = this;
    el.classList.add('customtable', ...this.options.classes);
  }

  /**
   * Aktueller Reducer-State (siehe `tableReducer.ts`).
   * @returns Der State mit Zeilen, Spalten, Filter und Flags.
   */
  public getState(): TableReducerState<T> {
    return this.tableState;
  }

  /**
   * Achse B aktiv? `CustomTableView.tsx` löst die `customFunction`-Hooks dann einmal selbst aus; in
   * Achse A feuert bereits `render()`.
   * @returns `true` in Achse B.
   */
  public isReactManaged(): boolean {
    return this.reactDispatch !== null;
  }

  /**
   * Wendet `action` auf den Reducer-State an. Achse A: synchrone Zuweisung. Achse B: über `flushExtern`
   * (`reactRoot.ts`) in den `useReducer`-`dispatch` -- React verzögert Updates, externe Aufrufer lesen
   * aber direkt danach den neuen Wert (siehe `Row.ts`).
   * @param action - Reducer-Action (`tableReducer.ts`).
   */
  public dispatch(action: TableAction<T>): void {
    if (this.reactDispatch) {
      const reactDispatch = this.reactDispatch;
      flushExtern(() => reactDispatch(action));
    } else {
      this.tableState = tableReducer(this.tableState, action);
    }
  }

  /**
   * Sucht den `RowRecord` einer `uid` im aktuellen State (für den `Row`-Shim).
   * @param uid - Eindeutige Zeilen-Id.
   * @returns Der Record, oder `undefined` bei unbekannter `uid`.
   */
  public getRowRecord(uid: string): RowRecord<T> | undefined {
    return this.tableState.rows.find(row => row.uid === uid);
  }

  /**
   * Alle Zeilen der Tabelle.
   * @returns `Row`-Shims in Tabellenreihenfolge.
   */
  public getRows(): Row<T>[] {
    return this.rows.array;
  }

  /**
   * Zellwerte je Zeile.
   * @typeParam T - Zieltyp einer Zeile (Wertetupel), unabhängig vom Zeilentyp der Tabelle.
   * @returns Je Zeile die Zellwerte in Spaltenreihenfolge.
   */
  public getArray<T>(): T[] {
    return this.rows.array.map(row => Object.values(row.cells) as T);
  }

  /**
   * Zeichnet die Tabelle. Achse B: No-Op, React rendert selbst; die externen Aufrufer rufen es nach
   * eigenen Mutationen weiterhin auf (siehe `Row.ts`). Ruft `customFunction.beforeDraw`/`afterDraw`.
   */
  public draw(): void {
    if (this.reactDispatch) return;
    if (this.options.customFunction?.beforeDraw) this.options.customFunction.beforeDraw.call(this);
    this.render();
    if (this.options.customFunction?.afterDraw) this.options.customFunction.afterDraw.call(this);
  }

  /** Rendert die Tabelle neu (Achse A); in Achse B ein No-Op. Einstiegspunkt für Fußzeilen-Änderungen. */
  public drawFooter(): void {
    if (!this.reactDispatch) this.render();
  }

  /** Rendert die Tabelle neu (Achse A); in Achse B ein No-Op. Einstiegspunkt für Zeilen-Änderungen. */
  public drawRows(): void {
    if (!this.reactDispatch) this.render();
  }

  /** Rendert die Tabelle neu (Achse A); in Achse B ein No-Op. Einstiegspunkt für Kopfzeilen-Änderungen. */
  public drawHeader(): void {
    if (!this.reactDispatch) this.render();
  }

  /**
   * Rendert Kopf/Zeilen/Fuß in einem Zug neu (nur Achse A). `draw*()` unterscheiden nicht, was sich
   * geändert hat, React übernimmt das Diffing. `mount()` ist per `flushSync` synchron, der Aufrufer
   * sieht danach das aktualisierte DOM. Ruft die `before*`/`after*`-Hooks von `customFunction`.
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

  /**
   * Benachrichtigt den `onChange`-Callback der Optionen (AutoSave-Anbindung, siehe
   * `createOnChangeHandler`). Ohne Callback ein No-Op.
   */
  public _notifyChange(): void {
    if (this.options.onChange) this.options.onChange(this);
  }

  /**
   * Default für `options.editing.deleteAllRows`. Alle Tabellen liefern eine eigene Variante (siehe
   * `*Tab.tsx`), der Zweig ist praktisch unerreicht. Soft-Delete via `rows.deleteAll()`.
   */
  private deleteAllRows(): void {
    this.rows.deleteAll();
  }

  /**
   * Eindeutige Breakpoint-Namen der Spalten (`breakpoints` je Spalte ist leerzeichengetrennt).
   * @param array - Spalten oder Spaltenoptionen; ohne Angabe `columns.array`.
   * @returns Die verwendeten Breakpoint-Namen ohne Duplikate.
   */
  public breakpoints(array: Column<T>[] | CustomTableOptionsAll<T>['columns']): Breakpoints[] | [] {
    if (!array) array = this.columns.array;
    return <Breakpoints[] | []>(
      Array.from(new Set(array.map(column => column.breakpoints).flatMap(f => (f ? f.split(' ') : []))))
    );
  }

  /**
   * Größter Breakpoint-Wert unter den Breakpoints der Spalten.
   * @param array - Spalten oder Spaltenoptionen; Default `columns.array`.
   * @returns Größte Breakpoint-Weite; ohne Breakpoints `-Infinity` (`Math.max()` ohne Argumente).
   */
  public maxBreakpoint(array: Column<T>[] | CustomTableOptionsAll<T>['columns'] = this.columns.array): number {
    return Math.max(...this.breakpoints(array).map(breakpoint => this.o.breakpoints[breakpoint]));
  }
}

/**
 * Achse A: erzeugt eine Tabelle gegen ein vorhandenes `<table>` (Kurzform von
 * `CustomTable.fromElement()`).
 * @param table - Id oder Element der Tabelle.
 * @param options - Konfiguration der Tabelle.
 * @returns Die neue Instanz.
 * @throws {Error} Siehe `CustomTable.fromElement()`.
 */
export function createCustomTable<T extends CustomTableTypes>(
  table: string | CustomHTMLTableElement<T>,
  options: CustomTableOptions<T>,
): CustomTable<T> {
  return CustomTable.fromElement<T>(table, options);
}

/**
 * Achse B: ersetzt `createCustomTable()` in einer Tab-Komponente. Baut die Shim-Instanz einmal (`useRef`;
 * `options` wird nur beim ersten Aufruf gelesen) und bindet sie an einen `useReducer`. Die Tab rendert
 * `<CustomTableView table={...} />`; dessen `ref`-Callback ruft `instance.attachElement(el)`, weil das
 * `<table>` beim ersten Render noch fehlt.
 * @param elementId - Id des späteren `<table>`-Elements.
 * @param options - Konfiguration der Tabelle (nur beim ersten Aufruf gelesen).
 * @returns Dieselbe Instanz bei jedem Render.
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
 * `CustomTableView` ist nicht generisch (siehe dort), `<CustomTableView table={ftN} />` braucht daher
 * einen Cast auf den Erasure-Typ -- zentral hier statt an jeder Aufrufstelle.
 * @param table - Beliebig typisierte Tabelle.
 * @returns Dieselbe Instanz, typisiert als `CustomTable<CustomTableTypes>`.
 */
export function asAnyTable<T extends CustomTableTypes>(table: CustomTable<T>): CustomTable<CustomTableTypes> {
  return table as unknown as CustomTable<CustomTableTypes>;
}
