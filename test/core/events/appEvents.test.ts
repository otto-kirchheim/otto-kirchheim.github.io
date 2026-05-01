import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test';
import { publishEvent } from '@/core/events/appEvents';
import { clearAllEventListeners, onEvent } from '@/core/events/appEvents';

describe('E2E: data:changed event flow', () => {
  beforeEach(() => {
    clearAllEventListeners();
  });

  afterEach(() => {
    clearAllEventListeners();
  });

  it('publishes data:changed event with resource and action', () => {
    const listener = vi.fn();
    onEvent('data:changed', listener);

    publishEvent('data:changed', { resource: 'BZ', action: 'update' });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ resource: 'BZ', action: 'update' });
  });

  it('multiple subscribers receive the same event', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    onEvent('data:changed', listener1);
    onEvent('data:changed', listener2);

    publishEvent('data:changed', { resource: 'EWT', action: 'create' });

    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe prevents further notifications', () => {
    const listener = vi.fn();
    const unsub = onEvent('data:changed', listener);

    publishEvent('data:changed', { resource: 'N', action: 'delete' });
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
    publishEvent('data:changed', { resource: 'N', action: 'update' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('clearAllEventListeners removes all subscribers', () => {
    const listener = vi.fn();
    onEvent('data:changed', listener);

    clearAllEventListeners();

    publishEvent('data:changed', { resource: 'BE', action: 'sync' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('events on different channels do not interfere', () => {
    const dataListener = vi.fn();
    const logoutListener = vi.fn();
    onEvent('data:changed', dataListener);
    onEvent('user:logout', logoutListener);

    publishEvent('data:changed', { resource: 'BZ', action: 'update' });

    expect(dataListener).toHaveBeenCalledTimes(1);
    expect(logoutListener).not.toHaveBeenCalled();
  });
});
