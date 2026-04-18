import Storage, { type TStorageData } from '../../infrastructure/storage/Storage';
import type { StateStore } from './stateStore';

export class StorageStateStore implements StateStore {
  get<T>(key: string): T | null {
    const storageKey = key as TStorageData;
    if (!Storage.check(storageKey)) return null;
    return Storage.get<T>(storageKey, true);
  }

  set<T>(key: string, value: T): void {
    Storage.set(key as TStorageData, value);
  }

  remove(key: string): void {
    Storage.remove(key as TStorageData);
  }

  has(key: string): boolean {
    return Storage.check(key as TStorageData);
  }
}
