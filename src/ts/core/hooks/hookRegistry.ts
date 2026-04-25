import type { IVorgabenU } from '../types';

export interface HookMap {
  'auth:failure': () => void;
  'network:reconnect': () => void;
  'pre-save:settings': () => IVorgabenU;
}

const hooks = new Map<keyof HookMap, HookMap[keyof HookMap]>();

export function registerHook<K extends keyof HookMap>(name: K, handler: HookMap[K]): void {
  hooks.set(name, handler);
}

export function getHook<K extends keyof HookMap>(name: K): HookMap[K] | undefined {
  return hooks.get(name) as HookMap[K] | undefined;
}

export function invokeHook<K extends keyof HookMap>(
  name: K,
  ...args: Parameters<HookMap[K]>
): ReturnType<HookMap[K]> | undefined {
  const handler = hooks.get(name) as HookMap[K] | undefined;
  return handler ? (handler as (...a: unknown[]) => ReturnType<HookMap[K]>)(...args) : undefined;
}

/** Remove all hooks (for testing). */
export function clearAllHooks(): void {
  hooks.clear();
}
