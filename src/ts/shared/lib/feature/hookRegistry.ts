import type { IVorgabenU } from '@/types';
import type { HelpContextKey } from '@/shared/lib/help/helpContent';

/**
 * Aufrufe gegen die Schichtrichtung (FSD: Import nur abwärts): untere Schichten rufen per `invokeHook`,
 * `main.tsx` registriert die Implementierungen aus app, pages und widgets.
 */
export interface HookMap {
  'auth:failure': () => void;
  /** Nachbereitung eines erfolgreichen Logins (`app/session/userLoginSuccess`). */
  'auth:login-success': (params: {
    username: string;
    role?: string;
    email?: string;
    emailVerified?: boolean;
  }) => Promise<void>;
  /** Lädt die Benutzerdaten eines Monats (`app/session/loadUserDaten`). */
  'session:load-month': (monat: number, jahr: number) => Promise<void>;
  /** Öffnet die Hilfe zu einem Kontext (`widgets/help-modal/openHelpModal`). */
  'help:open': (key: HelpContextKey) => Promise<void>;
  'network:reconnect': () => void;
  'pre-save:settings': () => IVorgabenU;
  'app:version-outdated': () => void;
}

const hooks = new Map<keyof HookMap, HookMap[keyof HookMap]>();

/**
 * Registriert den Handler eines Hooks; pro Hook gibt es genau einen. Ein zweiter Handler
 * unter demselben Namen wird mit einer Warnung verworfen.
 *
 * @typeParam K - Hook-Name aus `HookMap`.
 * @param name - Hook-Name.
 * @param handler - Handler passend zur Signatur in `HookMap`.
 */
export function registerHook<K extends keyof HookMap>(name: K, handler: HookMap[K]): void {
  if (hooks.has(name)) {
    console.warn(`Hook '${name}' already registered, skipping duplicate`);
    return;
  }
  hooks.set(name, handler);
}

/**
 * Liefert den registrierten Handler eines Hooks.
 *
 * @typeParam K - Hook-Name aus `HookMap`.
 * @param name - Hook-Name.
 * @returns Der Handler oder `undefined`, wenn keiner registriert ist.
 */
export function getHook<K extends keyof HookMap>(name: K): HookMap[K] | undefined {
  return hooks.get(name) as HookMap[K] | undefined;
}

/**
 * Ruft den Handler eines Hooks auf, falls einer registriert ist.
 *
 * @typeParam K - Hook-Name aus `HookMap`.
 * @param name - Hook-Name.
 * @param args - Argumente, die an den Handler gehen.
 * @returns Rueckgabewert des Handlers oder `undefined` ohne Handler.
 */
export function invokeHook<K extends keyof HookMap>(
  name: K,
  ...args: Parameters<HookMap[K]>
): ReturnType<HookMap[K]> | undefined {
  const handler = hooks.get(name) as HookMap[K] | undefined;
  return handler ? (handler as (...a: unknown[]) => ReturnType<HookMap[K]>)(...args) : undefined;
}

/** Entfernt alle Hooks (nur fuer Tests). */
export function clearAllHooks(): void {
  hooks.clear();
}
