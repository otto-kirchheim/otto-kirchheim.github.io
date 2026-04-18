import { afterEach, describe, expect, it, vi } from 'bun:test';
import { clearAllEventListeners, onEvent, publishEvent } from '../../src/ts/core';

describe('Typed Event System', () => {
  afterEach(() => {
    clearAllEventListeners();
  });

  it('delivers typed payload to subscriber', () => {
    const listener = vi.fn();
    onEvent('data:changed', listener);

    publishEvent('data:changed', { resource: 'EWT', action: 'update' });

    expect(listener).toHaveBeenCalledWith({ resource: 'EWT', action: 'update' });
  });

  it('does not deliver events from other channels', () => {
    const listener = vi.fn();
    onEvent('user:logout', listener);

    publishEvent('data:changed', { resource: 'BZ', action: 'create' });

    expect(listener).not.toHaveBeenCalled();
  });

  it('supports multiple listeners on the same channel', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    onEvent('data:changed', listener1);
    onEvent('data:changed', listener2);

    publishEvent('data:changed', { resource: 'N', action: 'delete' });

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
  });

  it('returns unsubscribe function', () => {
    const listener = vi.fn();
    const unsub = onEvent('data:changed', listener);

    unsub();
    publishEvent('data:changed', { resource: 'EWT', action: 'sync' });

    expect(listener).not.toHaveBeenCalled();
  });

  it('clearAllEventListeners removes all listeners', () => {
    const listener = vi.fn();
    onEvent('feature:sync', listener);

    clearAllEventListeners();
    publishEvent('feature:sync', { source: 'EWT', target: 'Neben', status: 'synced' });

    expect(listener).not.toHaveBeenCalled();
  });

  it('publish to channel with no listeners does not throw', () => {
    expect(() => publishEvent('user:logout', { reason: 'manual' })).not.toThrow();
  });
});
