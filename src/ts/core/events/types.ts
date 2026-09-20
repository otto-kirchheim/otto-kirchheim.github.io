import type { IDatenEWT, TResourceKey } from '@/types';

/** Kanal-Definitionen (Name -> Nutzlast); neue Kanaele hier ergaenzen, dann sind Sender und Empfaenger typsicher. */
export interface EventChannels {
  'data:changed': { resource: TResourceKey | 'all'; action: 'create' | 'update' | 'delete' | 'sync' };
  'ewt:persisted': { rows: IDatenEWT[] };
  'user:logout': { reason: 'manual' | 'token-expired' | 'version-mismatch' };
  'feature:sync': { source: string; target: string; status: 'syncing' | 'synced' | 'error' };
}

export type EventChannel = keyof EventChannels;
