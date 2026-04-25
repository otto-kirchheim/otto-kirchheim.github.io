type TDataScope = 'monat' | 'all';
type TEwtFilter = 'starttag' | 'buchungstag' | 'beide';

interface IDataQueryOptions {
  scope?: TDataScope;
}

interface IEwtQueryOptions extends IDataQueryOptions {
  /** EWT-spezifisch: Filter nach starttag, buchungstag oder beide (Standard: beide) */
  filter?: TEwtFilter;
}

export type { TDataScope, TEwtFilter };
export type { IDataQueryOptions, IEwtQueryOptions };
