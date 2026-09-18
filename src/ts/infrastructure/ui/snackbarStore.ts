/**
 * Snackbar-Status als `useSyncExternalStore`-kompatibler Modul-Store, analog
 * `autoSaveStatusStore.ts`. `CustomSnackbar.ts`s `createSnackBar()` bleibt die einzige
 * oeffentliche Funktion (124 Aufrufstellen unveraendert) -- ruft hier nur noch `addSnackbar()`
 * auf. `SnackbarHost.tsx`/`SnackbarItem.tsx` rendern den Store deklarativ statt per
 * `document.createElement`.
 */

export type Tstatus =
  'green' | 'success' | 'warning' | 'alert' | 'orange' | 'danger' | 'error' | 'red' | 'info' | '' | undefined;
export type Tposition = 'br' | 'tr' | 'tc' | 'tm' | 'bc' | 'bm' | 'tl' | 'bl';
export type Ticon =
  | 'exclamation'
  | 'warn'
  | 'danger'
  | 'info'
  | 'question'
  | 'question-mark'
  | 'plus'
  | 'add'
  | '!'
  | '?'
  | '+'
  | (string & { fromT?: string });

export interface SnackBarAction {
  text: string;
  function?: () => void;
  dismiss?: boolean;
  class?: string[];
}

export interface SnackBarOptions {
  message: string;
  titel?: string;
  status?: Tstatus;
  timeout?: number | false;
  position?: Tposition;
  fixed?: boolean;
  dismissible?: boolean;
  container?: HTMLElement | string;
  width?: number;
  speed?: string | number;
  icon?: Ticon;
  actions?: SnackBarAction[];
}

export interface SnackbarEntry {
  id: string;
  message: string;
  titel?: string;
  status: Tstatus;
  timeout: number | false;
  position: Tposition;
  fixed: boolean;
  dismissible: boolean;
  /** Bereits aufgeloest (Fallback+Warnung bei ungueltigem Selektor passiert einmalig hier, siehe `addSnackbar()`). */
  container: HTMLElement;
  width?: number;
  speed?: string | number;
  icon?: Ticon;
  actions: SnackBarAction[];
  /** Schliess-Animation laeuft (siehe `SnackbarItem.tsx`) -- Eintrag verschwindet erst danach per `removeSnackbar()`. */
  closing: boolean;
}

type Listener = () => void;

const entries: SnackbarEntry[] = [];
const listeners = new Set<Listener>();
let snapshot: SnackbarEntry[] = entries;
let nextId = 0;

function notify(): void {
  snapshot = [...entries];
  for (const listener of listeners) listener();
}

/** Wie die alte `_setContainer()`: String-Selektor auflösen, bei Fehlschlag auf `document.body` zurückfallen + warnen. */
function resolveContainer(container: HTMLElement | string): HTMLElement {
  if (typeof container !== 'string') return container;
  const found = document.querySelector<HTMLElement>(container);
  if (found) return found;
  console.warn('SnackBar: Could not find target container ' + container);
  return document.body;
}

export function subscribeSnackbars(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnackbarsSnapshot(): SnackbarEntry[] {
  return snapshot;
}

export function addSnackbar(options: SnackBarOptions): { Close: () => void } {
  const id = String(nextId++);
  const entry: SnackbarEntry = {
    id,
    message: options.message ?? 'Operation performed successfully.',
    titel: options.titel,
    status: options.status ?? 'info',
    timeout: options.timeout ?? 5000,
    position: options.position ?? 'br',
    fixed: options.fixed ?? false,
    dismissible: options.dismissible ?? true,
    container: resolveContainer(options.container ?? document.body),
    width: options.width,
    speed: options.speed,
    icon: options.icon,
    actions: options.actions ?? [],
    closing: false,
  };
  entries.push(entry);
  notify();
  return { Close: () => startClosingSnackbar(id) };
}

/** Startet die Schliess-Animation (siehe `SnackbarItem.tsx`); No-Op, wenn schon geschlossen wird. */
export function startClosingSnackbar(id: string): void {
  const entry = entries.find(e => e.id === id);
  if (!entry || entry.closing) return;
  entry.closing = true;
  notify();
}

/** Entfernt den Eintrag endgueltig -- von `SnackbarItem.tsx` nach Ablauf der Schliess-Animation aufgerufen. */
export function removeSnackbar(id: string): void {
  const index = entries.findIndex(e => e.id === id);
  if (index === -1) return;
  entries.splice(index, 1);
  notify();
}

/** Für Tests: Store auf Ausgangszustand zurücksetzen. */
export function resetSnackbarStore(): void {
  entries.length = 0;
  nextId = 0;
  notify();
}
