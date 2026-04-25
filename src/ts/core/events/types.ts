import type { IDatenEWT, TResourceKey } from '@/types';

/**
 * Typed event channel definitions.
 *
 * Add new channels here — publishers and subscribers get full type safety.
 */
export interface EventChannels {
  'data:changed': { resource: TResourceKey | 'all'; action: 'create' | 'update' | 'delete' | 'sync' };
  'ewt:persisted': { rows: IDatenEWT[] };
  'user:logout': { reason: 'manual' | 'token-expired' | 'version-mismatch' };
  'feature:sync': { source: string; target: string; status: 'syncing' | 'synced' | 'error' };
}

export type EventChannel = keyof EventChannels;
