type TDataScope = 'monat' | 'all';
type TEwtFilter = 'starttag' | 'buchungstag' | 'beide';

interface IDataQueryOptions {
  scope?: TDataScope;
  /** Lokal geloeschte, aber noch nicht synchronisierte Zeilen (`__localState === 'deleted'`) ausschliessen. */
  excludeDeleted?: boolean;
}

interface IEwtQueryOptions extends IDataQueryOptions {
  /** EWT-spezifisch: Filter nach starttag, buchungstag oder beide (Standard: beide) */
  filter?: TEwtFilter;
}

export type { TDataScope, TEwtFilter };
export type { IDataQueryOptions, IEwtQueryOptions };
