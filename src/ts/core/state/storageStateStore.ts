import Storage, { type TStorageData } from '@/infrastructure/storage/Storage';
import type { StateStore } from './stateStore';

/** `StateStore` auf Basis des typisierten `Storage`; Keys werden ungeprüft als `TStorageData` behandelt. */
export class StorageStateStore implements StateStore {
  /**
   * Liest einen Wert.
   *
   * @param key - Storage-Key.
   * @returns Der Wert oder `null`, wenn der Key fehlt.
   */
  get<T>(key: string): T | null {
    const storageKey = key as TStorageData;
    if (!Storage.check(storageKey)) return null;
    return Storage.get<T>(storageKey, true);
  }

  /**
   * Schreibt einen Wert.
   *
   * @param key - Storage-Key.
   * @param value - Zu speichernder Wert.
   */
  set<T>(key: string, value: T): void {
    Storage.set(key as TStorageData, value);
  }

  /**
   * Entfernt einen Key.
   *
   * @param key - Storage-Key.
   */
  remove(key: string): void {
    Storage.remove(key as TStorageData);
  }

  /**
   * Prüft, ob ein Key existiert.
   *
   * @param key - Storage-Key.
   * @returns `true`, wenn der Key vorhanden ist.
   */
  has(key: string): boolean {
    return Storage.check(key as TStorageData);
  }
}
