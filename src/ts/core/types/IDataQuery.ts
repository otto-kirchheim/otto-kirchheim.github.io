import type { DataScope as TDataScope, EwtFilter as TEwtFilter } from '@otto-kirchheim/nebengeld-shared';
export type { DataScope as TDataScope, EwtFilter as TEwtFilter } from '@otto-kirchheim/nebengeld-shared';

interface IDataQueryOptions {
  scope?: TDataScope;
  /** Lokal geloeschte, aber noch nicht synchronisierte Zeilen (`__localState === 'deleted'`) ausschliessen. */
  excludeDeleted?: boolean;
}

interface IEwtQueryOptions extends IDataQueryOptions {
  /** EWT-spezifisch: Filter nach starttag, buchungstag oder beide (Standard: beide) */
  filter?: TEwtFilter;
}

export type { IDataQueryOptions, IEwtQueryOptions };
