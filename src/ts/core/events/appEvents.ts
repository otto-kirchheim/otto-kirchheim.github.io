import type { EventChannel, EventChannels } from './types';

// --- Typed event channel system ---
type ChannelListener<K extends EventChannel> = (data: EventChannels[K]) => void;

const channelListeners = new Map<EventChannel, Set<ChannelListener<EventChannel>>>();

/**
 * Publish a typed event on a specific channel.
 *
 * @param channel - The event channel name
 * @param data - Typed payload matching the channel definition
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
 * Subscribe to a typed event channel. Returns an unsubscribe function.
 *
 * @param channel - The event channel name
 * @param listener - Callback receiving the typed payload
 * @returns Unsubscribe function
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

/** Remove all listeners from all typed channels (for testing). */
export function clearAllEventListeners(): void {
  channelListeners.clear();
}
