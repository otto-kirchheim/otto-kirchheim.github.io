import type { IDatenEWT, TResourceKey } from '@/types';

/** Kanal-Definitionen (Name -> Nutzlast); neue Kanaele hier ergaenzen, dann sind Sender und Empfaenger typsicher. */
export interface EventChannels {
  'data:changed': { resource: TResourceKey | 'all'; action: 'create' | 'update' | 'delete' | 'sync' };
  'ewt:persisted': { rows: IDatenEWT[] };
  /** EWT-Zeilen wurden auf dem Server geloescht; verknuepfte Features loesen ihre `EWT`-Verweise auf diese Ids. */
  'ewt:deleted': { ids: string[] };
  'user:logout': { reason: 'manual' | 'token-expired' | 'version-mismatch' };
  'feature:sync': { source: string; target: string; status: 'syncing' | 'synced' | 'error' };
}

export type EventChannel = keyof EventChannels;
