import type { IDataQueryOptions } from '@/types';
import { getStoredMonatJahr } from '../date/dateStorage';
import { default as normalizeResourceRows } from './normalizeResourceRows';
import { default as Storage, type TStorageData } from '../storage/Storage';

/**
 * Filterpraedikat: Zeile ist lokal nicht als geloescht (`__localState: 'deleted'`) markiert.
 *
 * @typeParam T - Zeilentyp.
 * @param row - Gespeicherte Zeile.
 * @returns `false` bei lokal geloeschten Zeilen.
 */
function isNotLocallyDeleted<T>(row: T): boolean {
  return (row as { __localState?: string }).__localState !== 'deleted';
}

/**
 * Baut eine `getXDaten(data?, Monat?, options?)`-Funktion nach dem in allen vier Features
 * (Bereitschaft/EWT/Neben/EA) wiederholten Muster: Benutzer-Check, Storage-Fallback,
 * `normalizeResourceRows`, optionaler `excludeDeleted`-Filter, `scope:'all'`-Kurzschluss,
 * Monats-Auflösung. Nur der feature-spezifische Monats-Filter (`filterRows`) und optionale
 * Extras (`minYear`, `normalize`) bleiben beim Aufrufer.
 *
 * @typeParam T - Zeilentyp der Ressource.
 * @typeParam Options - Abfrageoptionen (`excludeDeleted`, `scope`, ...).
 * @param config - Storage-Key, optionales `minYear`/`normalize` und der Monats-Filter `filterRows`.
 * @returns Getter, der leer bleibt ohne Benutzer, vor `minYear` oder ohne aufloesbaren Monat.
 */
export function createDatenGetter<T, Options extends IDataQueryOptions = IDataQueryOptions>(config: {
  storageKey: TStorageData;
  /** Ab diesem Jahr existieren Daten überhaupt (z.B. EA erst ab 2025) — davor immer leeres Array. */
  minYear?: number;
  /** Zusätzlicher Aufbereitungsschritt nach `normalizeResourceRows` (z.B. Zulagen-Hydration bei Neben). */
  normalize?: (rows: T[]) => T[];
  filterRows: (rows: T[], activeMonat: number, options?: Options) => T[];
}) {
  /**
   * Liefert die Zeilen der Ressource aus `data` bzw. dem Storage, gefiltert nach Monat.
   *
   * @param data - Optionale Quelle statt Storage.
   * @param Monat - Monat (1-12); Standard ist der gespeicherte Monat.
   * @param options - `excludeDeleted` blendet lokal geloeschte Zeilen aus, `scope: 'all'` liefert alle Monate.
   * @returns Gefilterte Zeilen.
   */
  return function getDaten(data?: T[], Monat?: number, options?: Options): T[] {
    if (!Storage.check('Benutzer')) return [];

    const { monat: storedMonat, jahr } = getStoredMonatJahr();
    if (config.minYear !== undefined && jahr < config.minYear) return [];

    const sourceData = data ?? Storage.get<unknown>(config.storageKey, { default: [] });
    const normalizedRows = normalizeResourceRows<T>(sourceData);
    const rows = config.normalize ? config.normalize(normalizedRows) : normalizedRows;
    const filteredRows = options?.excludeDeleted ? rows.filter(isNotLocallyDeleted) : rows;

    if (options?.scope === 'all') return filteredRows;

    const activeMonat = Monat ?? storedMonat;
    return activeMonat ? config.filterRows(filteredRows, activeMonat, options) : [];
  };
}
