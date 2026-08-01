import type { IVorgabeValue } from '@otto-kirchheim/nebengeld-shared';

/**
 * Vollständig gemergter Vorgaben-Wert (nach createDatenGeldProxy-Merge, siehe
 * Berechnung/calculateBerechnungRows.ts) — alle Felder garantiert gesetzt,
 * anders als der rohe, pro Monat teilweise befüllte Speicher-Eintrag
 * (`IVorgabeValue` aus shared).
 */
export type IVorgabenGeldType = Required<IVorgabeValue>;

export interface IVorgabenGeld {
  [key: number]: IVorgabenGeldType;
  //getMonat: (maxMonat: number) => IVorgabenGeldType;
}
