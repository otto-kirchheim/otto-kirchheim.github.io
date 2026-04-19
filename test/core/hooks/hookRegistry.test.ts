import { afterEach, describe, expect, it, vi } from 'bun:test';
import { clearAllHooks, getHook, invokeHook, registerHook } from '../../../src/ts/core/hooks';
import type { IVorgabenU } from '../../../src/ts/interfaces';

const makeUserData = (): IVorgabenU =>
  ({
    pers: { Vorname: 'Test', Nachname: '', Geburtsdatum: '', GeburtsdatumPartner: '' },
    aZ: {},
    fZ: {},
    vorgabenB: {},
    Einstellungen: {},
  }) as unknown as IVorgabenU;

describe('hookRegistry', () => {
  afterEach(() => {
    clearAllHooks();
  });

  it('registerHook / getHook round-trips the handler', () => {
    const handler = vi.fn();
    registerHook('post-save', handler);
    expect(getHook('post-save')).toBe(handler);
  });

  it('invokeHook calls the registered handler', () => {
    const handler = vi.fn();
    registerHook('auth:failure', handler);
    invokeHook('auth:failure');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('invokeHook returns undefined when no handler is registered', () => {
    const result = invokeHook('network:reconnect');
    expect(result).toBeUndefined();
  });

  it('invokeHook returns the handler return value', () => {
    const userData = makeUserData();
    registerHook('pre-save:settings', () => userData);
    const result = invokeHook('pre-save:settings');
    expect(result).toBe(userData);
  });

  it('registerHook overwrites a previously registered handler', () => {
    const first = vi.fn();
    const second = vi.fn();
    registerHook('post-save', first);
    registerHook('post-save', second);
    invokeHook('post-save');
    expect(second).toHaveBeenCalled();
    expect(first).not.toHaveBeenCalled();
  });

  it('clearAllHooks removes all handlers', () => {
    const handler = vi.fn();
    registerHook('auth:failure', handler);
    clearAllHooks();
    invokeHook('auth:failure');
    expect(handler).not.toHaveBeenCalled();
  });
});
