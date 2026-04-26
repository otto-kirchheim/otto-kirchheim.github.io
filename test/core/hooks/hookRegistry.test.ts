import { afterEach, describe, expect, it, vi } from 'bun:test';
import { clearAllHooks, getHook, invokeHook, registerHook } from '@/core/hooks';
import type { IVorgabenU } from '@/types';

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
    registerHook('auth:failure', handler);
    expect(getHook('auth:failure')).toBe(handler);
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

  it('registerHook keeps the first handler and skips duplicates', () => {
    const first = vi.fn();
    const second = vi.fn();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    registerHook('network:reconnect', first);
    registerHook('network:reconnect', second);
    invokeHook('network:reconnect');
    expect(first).toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith("Hook 'network:reconnect' already registered, skipping duplicate");
    warnSpy.mockRestore();
  });

  it('clearAllHooks removes all handlers', () => {
    const handler = vi.fn();
    registerHook('auth:failure', handler);
    clearAllHooks();
    invokeHook('auth:failure');
    expect(handler).not.toHaveBeenCalled();
  });
});
