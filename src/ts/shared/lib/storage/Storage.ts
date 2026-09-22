import { createSnackBar } from '../../ui/snackbar/CustomSnackbar';

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
  dataEA = 'Daten Entgeltausgleich',
  VorgabenU = 'Persönliche Daten',
  VorgabenGeld = 'Vorgaben Geld',
  datenBerechnung = 'Daten Berechnung',
  Jahreswechsel = 'Jahreswechsel',
  theme = 'Theme',
  dataServer = 'Server Daten',
  actAsUserId = 'Act-As User-ID',
  actAsUserName = 'Act-As User-Name',
  BenutzerRolle = 'Benutzer Rolle',
  Version = 'Version der App',
  AccessToken = 'Access Token',
  RefreshToken = 'Refresh Token',
  key = 'Test Daten',
  OnboardingAbgeschlossen = 'Onboarding abgeschlossen',
  OnboardingPersSnapshot = 'Onboarding Pers-Snapshot',
  formularVersionCache = 'Formular-Version-Cache',
  vorlagenPdfCache = 'Vorlagen-PDF-Cache',
  signaturCache = 'Unterschrift-Cache',
}

export type TStorageData = keyof typeof StorageData;

/** Keys die intern als `{ data, timestamp }` gespeichert werden */
const RESOURCE_KEYS: ReadonlySet<TStorageData> = new Set(['dataBZ', 'dataBE', 'dataE', 'dataN', 'dataEA', 'VorgabenU']);

type DataWithTimestamp<T = unknown> = { data: T; timestamp: number };

class Storage implements IStorage {
  private static instance: Storage;

  /**
   * Liefert die einzige Instanz (Singleton, lazy angelegt).
   *
   * @returns Die gemeinsame `Storage`-Instanz.
   */
  static getInstance(): Storage {
    if (!Storage.instance) Storage.instance = new Storage();
    return Storage.instance;
  }

  /**
   * Speichert einen Wert als JSON im `localStorage`. Bei Ressourcen-Keys wird automatisch in
   * `{ data, timestamp }` gewrappt (Timestamp = jetzt).
   *
   * @param key - Storage-Key.
   * @param value - Zu speichernder Wert.
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
   * Speichert einen Wert immer als `{ data, timestamp }` mit explizitem Timestamp (z.B. vom Server).
   *
   * @param key - Storage-Key.
   * @param value - Zu speichernder Wert.
   * @param timestamp - Zeitstempel der Daten in ms.
   */
  setWithTimestamp<T>(key: TStorageData, value: T, timestamp: number): void {
    const wrapped: DataWithTimestamp<T> = { data: value, timestamp };
    localStorage.setItem(key, JSON.stringify(wrapped));
  }

  /**
   * Gibt den Timestamp einer Ressource zurück.
   *
   * @param key - Storage-Key.
   * @returns Der Timestamp in ms; 0, wenn kein Ressourcen-Key, nicht vorhanden oder ohne Wrapper.
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
   * Liest einen Wert; `null`, wenn der Key fehlt.
   *
   * @param key - Storage-Key.
   */
  get<T>(key: TStorageData): T | null;
  /**
   * Liest einen Wert; wirft (mit Snackbar), wenn der Key fehlt.
   *
   * @param key - Storage-Key.
   * @param checked - Immer `true`.
   */
  get<T>(key: TStorageData, checked: true): T;
  /**
   * Liest einen Wert mit Prüfung und/oder Ersatzwert.
   *
   * @param key - Storage-Key.
   * @param options - `check`: wirft, wenn der Key fehlt; `default`: Ersatzwert, wenn er fehlt.
   */
  get<T>(key: TStorageData, options: { check?: true; default?: T }): T;
  /**
   * Liest einen Wert. Bei Ressourcen-Keys wird `{ data, timestamp }` automatisch entpackt (nur `data`
   * kommt zurück); Altbestände ohne Wrapper und doppelt gewrappte Werte werden dabei korrigiert und
   * neu gespeichert. Nicht-JSON-Strings werden als JSON zurückgeschrieben.
   *
   * @param key - Storage-Key.
   * @param optionsOrChecked - `true` oder `{ check: true }`: wirft (mit Snackbar), wenn der Key fehlt.
   *   `{ default }`: Ersatzwert, wenn der Key fehlt.
   * @returns Der gespeicherte Wert; ohne Vorgabe `null`, wenn der Key fehlt.
   * @throws {Error} Wenn der Key fehlt und `true`/`check` gesetzt ist (ohne `default`).
   */
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

  /**
   * Entfernt einen Key.
   *
   * @param key - Storage-Key.
   */
  remove(key: TStorageData): void {
    localStorage.removeItem(key);
  }

  /** Leert den gesamten `localStorage` (nicht nur die Keys dieser App). */
  clear(): void {
    localStorage.clear();
  }

  /**
   * Prüft, ob unter dem Key ein nicht-leerer Wert liegt.
   *
   * @param key - Storage-Key.
   * @returns `true`, wenn der Rohwert vorhanden und nicht der leere String ist.
   */
  check(key: string extends TStorageData ? TStorageData : string): boolean {
    return Boolean(localStorage.getItem(key));
  }

  /**
   * Anzahl der Einträge im `localStorage`.
   *
   * @returns Die Anzahl aller Keys, nicht nur der dieser App.
   */
  size(): number {
    return localStorage.length;
  }

  /**
   * Vergleicht den gespeicherten Wert mit `compareValue`, unabhängig von der Reihenfolge der
   * Objekt-Keys.
   *
   * @param key - Storage-Key.
   * @param compareValue - Vergleichswert.
   * @returns `true` bei Gleichheit; `false` bei fehlendem Key oder Fehler beim Vergleich.
   */
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

  /**
   * Serialisiert einen Wert kanonisch: Objekt-Keys rekursiv sortiert, damit gleiche Inhalte gleich
   * aussehen.
   *
   * @param value - Beliebiger JSON-Wert.
   * @returns Der kanonische JSON-String.
   */
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

  /**
   * Migriert einen nicht als JSON gespeicherten Rohwert, indem er über `set` neu (als JSON) abgelegt wird.
   *
   * @param key - Storage-Key.
   * @param value - Der gelesene Rohwert.
   * @returns `value` unverändert.
   */
  private convertToJson<T>(key: TStorageData, value: T): T {
    this.set(key, value);
    return value;
  }

  /**
   * Prüft, ob ein Wert ein parsbarer JSON-String ist.
   *
   * @param str - Zu prüfender Wert.
   * @returns `true` bei String, der sich mit `JSON.parse` lesen lässt.
   */
  private isJsonString(str: unknown): boolean {
    if (typeof str !== 'string') return false;
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Zeigt den Fehler als Snackbar an und reicht ihn zum Werfen zurück (`throw this.…`).
   *
   * @param err - Der Fehler.
   * @returns `err` unverändert.
   */
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
