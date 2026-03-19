import { createSnackBar } from '../class/CustomSnackbar';

interface IStorage {
  set<T>(key: TStorageData, value: T): void;

  get<T>(key: TStorageData): T | null;
  get<T>(key: TStorageData, checked: true): T;
  get<T>(key: TStorageData, options: { check?: true; default?: T }): T;

  remove(key: TStorageData): void;
  clear(): void;
  check(key: TStorageData): boolean;
  size(): number;
  compare<T>(key: TStorageData, compareValue: T): boolean;
}

enum StorageData {
  Benutzer = 'Benutzer',
  BenutzerEmail = 'Benutzer E-Mail',
  Jahr = 'Jahr',
  Monat = 'Monat',
  dataBZ = 'Daten Bereitschaftszeitraum',
  dataBE = 'Daten Bereitschaftseinsatz',
  dataE = 'Daten EWT',
  dataN = 'Daten Nebengeld',
  VorgabenU = 'Persönliche Daten',
  VorgabenGeld = 'Vorgaben Geld',
  datenBerechnung = 'Daten Berechnung',
  Jahreswechsel = 'Jahreswechsel',
  theme = 'Theme',
  dataServer = 'Server Daten',
  actAsUserId = 'Act-As User-ID',
  actAsUserName = 'Act-As User-Name',
  Version = 'Version der App',
  key = 'Test Daten',
}

export type TStorageData = keyof typeof StorageData;

/** Keys die intern als `{ data, timestamp }` gespeichert werden */
const RESOURCE_KEYS: ReadonlySet<TStorageData> = new Set(['dataBZ', 'dataBE', 'dataE', 'dataN', 'VorgabenU']);

type DataWithTimestamp<T = unknown> = { data: T; timestamp: number };

class Storage implements IStorage {
  private static instance: Storage;

  static getInstance(): Storage {
    if (!Storage.instance) Storage.instance = new Storage();
    return Storage.instance;
  }

  /**
   * Speichert einen Wert.
   * Bei Ressourcen-Keys wird automatisch in `{ data, timestamp }` gewrappt.
   */
  set<T>(key: TStorageData, value: T): void {
    if (RESOURCE_KEYS.has(key)) {
      const wrapped: DataWithTimestamp<T> = { data: value, timestamp: Date.now() };
      localStorage.setItem(key, JSON.stringify(wrapped));
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  /**
   * Speichert einen Ressourcen-Wert mit explizitem Timestamp (z.B. vom Server).
   */
  setWithTimestamp<T>(key: TStorageData, value: T, timestamp: number): void {
    const wrapped: DataWithTimestamp<T> = { data: value, timestamp };
    localStorage.setItem(key, JSON.stringify(wrapped));
  }

  /**
   * Gibt den Timestamp einer Ressource zurück (0 falls nicht vorhanden oder kein Ressourcen-Key).
   */
  getTimestamp(key: TStorageData): number {
    if (!RESOURCE_KEYS.has(key)) return 0;
    const value = localStorage.getItem(key);
    if (value === null) return 0;
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && 'timestamp' in parsed) return parsed.timestamp as number;
    } catch {
      /* leer */
    }
    return 0;
  }

  /**
   * Liest einen Wert.
   * Bei Ressourcen-Keys wird automatisch `{ data, timestamp }` unwrappt → nur `data` zurückgegeben.
   * Altbestände (ohne Wrapper) werden automatisch migriert.
   */
  get<T>(key: TStorageData): T | null;
  get<T>(key: TStorageData, checked: true): T;
  get<T>(key: TStorageData, options: { check?: true; default?: T }): T;
  get<T>(key: TStorageData, optionsOrChecked?: { check?: true; default?: T } | true): T | null {
    if (optionsOrChecked !== true && optionsOrChecked !== undefined) {
      if (optionsOrChecked.default !== undefined && !this.check(key)) {
        return optionsOrChecked.default;
      } else if (optionsOrChecked.check && !this.check(key)) {
        throw this.showSnackbarAndThrowError(new Error(`"${StorageData[key] ?? key}" nicht gefunden`));
      }
    }
    const value = localStorage.getItem(key);

    if (optionsOrChecked === true) {
      if (value === null)
        throw this.showSnackbarAndThrowError(new Error(`"${StorageData[key] ?? key}" nicht gefunden`));
    } else if (value === null) return optionsOrChecked?.default ?? null;

    const parsed: unknown = this.isJsonString(value) ? JSON.parse(value!) : this.convertToJson<T>(key, value as T);

    // Ressourcen-Keys: unwrap { data, timestamp } → data
    if (RESOURCE_KEYS.has(key) && parsed && typeof parsed === 'object') {
      if (!('data' in parsed && 'timestamp' in parsed)) {
        // Altbestand ohne Wrapper: migrieren
        this.setWithTimestamp(key, parsed as T, 0);
        return parsed as T;
      }
      const inner = (parsed as DataWithTimestamp).data;
      // Doppelt gewrappte Altbestände auflösen und korrigiert speichern
      if (inner && typeof inner === 'object' && 'data' in inner && 'timestamp' in inner) {
        const unwrapped = (inner as DataWithTimestamp).data as T;
        this.setWithTimestamp(key, unwrapped, (parsed as DataWithTimestamp).timestamp);
        return unwrapped;
      }
      return inner as T;
    }

    return parsed as T;
  }

  remove(key: TStorageData): void {
    localStorage.removeItem(key);
  }

  clear(): void {
    localStorage.clear();
  }

  check(key: string extends TStorageData ? TStorageData : string): boolean {
    return Boolean(localStorage.getItem(key));
  }

  size(): number {
    return localStorage.length;
  }

  compare<T>(key: TStorageData, compareValue: T): boolean {
    const storedValue = localStorage.getItem(key);
    if (storedValue === null) return false;

    try {
      const parsed = this.isJsonString(storedValue) ? JSON.parse(storedValue) : storedValue;
      return this.normalizeAndStringify(parsed) === this.normalizeAndStringify(compareValue);
    } catch {
      return false;
    }
  }

  private normalizeAndStringify<T>(value: T): string {
    if (value === null || value === undefined) return JSON.stringify(value);
    if (typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return JSON.stringify(value.map(v => this.normalizeAndStringify(v)));

    const sorted = Object.keys(value)
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = this.normalizeAndStringify((value as Record<string, unknown>)[key]);
          return acc;
        },
        {} as Record<string, unknown>,
      );

    return JSON.stringify(sorted);
  }

  private convertToJson<T>(key: TStorageData, value: T): T {
    this.set(key, value);
    return value;
  }

  private isJsonString(str: unknown): boolean {
    if (typeof str !== 'string') return false;
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  private showSnackbarAndThrowError(err: Error): Error {
    createSnackBar({
      message: `Fehler: ${err.message}`,
      status: 'error',
      timeout: 3000,
      fixed: true,
    });
    return err;
  }
}

export default Storage.getInstance();
