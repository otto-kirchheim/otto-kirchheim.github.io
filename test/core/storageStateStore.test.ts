import { beforeEach, describe, expect, it } from 'bun:test';
import { StorageStateStore } from '../../src/ts/core/state/storageStateStore';

describe('StorageStateStore', () => {
  let store: StorageStateStore;

  beforeEach(() => {
    localStorage.clear();
    store = new StorageStateStore();
  });

  it('returns null for a key that does not exist', () => {
    expect(store.get('Benutzer')).toBeNull();
  });

  it('returns the stored value after set', () => {
    store.set('Benutzer', 'otto');
    expect(store.get<string>('Benutzer')).toBe('otto');
  });

  it('has returns false when key is absent', () => {
    expect(store.has('Benutzer')).toBe(false);
  });

  it('has returns true after set', () => {
    store.set('Benutzer', 'otto');
    expect(store.has('Benutzer')).toBe(true);
  });

  it('remove deletes the key', () => {
    store.set('Benutzer', 'otto');
    store.remove('Benutzer');
    expect(store.has('Benutzer')).toBe(false);
    expect(store.get('Benutzer')).toBeNull();
  });

  it('stores and retrieves complex objects', () => {
    const data = { name: 'otto', value: 42 };
    store.set('VorgabenU', data as never);
    expect(store.get('VorgabenU')).toEqual(data);
  });
});
