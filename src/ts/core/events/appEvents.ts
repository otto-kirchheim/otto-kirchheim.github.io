import type { EventChannel, EventChannels } from './types';

// --- Typisiertes Kanal-System ---
type ChannelListener<K extends EventChannel> = (data: EventChannels[K]) => void;

const channelListeners = new Map<EventChannel, Set<ChannelListener<EventChannel>>>();

/**
 * Sendet ein Event synchron an alle Listener des Kanals; ohne Listener passiert nichts.
 *
 * @typeParam K - Kanalname aus `EventChannels`.
 * @param channel - Kanalname.
 * @param data - Nutzlast passend zur Kanal-Definition.
 *
 * @example
 * publishEvent('data:changed', { resource: 'EWT', action: 'update' });
 */
export function publishEvent<K extends EventChannel>(channel: K, data: EventChannels[K]): void {
  const set = channelListeners.get(channel);
  if (!set) return;
  for (const fn of set) {
    (fn as ChannelListener<K>)(data);
  }
}

/**
 * Registriert einen Listener auf einem Kanal.
 *
 * @typeParam K - Kanalname aus `EventChannels`.
 * @param channel - Kanalname.
 * @param listener - Callback, der die typisierte Nutzlast erhaelt.
 * @returns Funktion, die den Listener wieder abmeldet.
 *
 * @example
 * const unsub = onEvent('data:changed', ({ resource, action }) => {
 *   console.log(`${resource} was ${action}d`);
 * });
 * // later: unsub();
 */
export function onEvent<K extends EventChannel>(channel: K, listener: ChannelListener<K>): () => void {
  let set = channelListeners.get(channel);
  if (!set) {
    set = new Set();
    channelListeners.set(channel, set);
  }
  set.add(listener as ChannelListener<EventChannel>);
  return () => {
    set!.delete(listener as ChannelListener<EventChannel>);
  };
}

/** Entfernt alle Listener aller Kanaele (nur fuer Tests). */
export function clearAllEventListeners(): void {
  channelListeners.clear();
}
