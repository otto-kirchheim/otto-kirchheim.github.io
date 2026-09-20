import type { IVorgabeValue } from '@otto-kirchheim/nebengeld-shared';

/**
 * Vollständig gemergter Vorgaben-Wert (nach `createDatenGeldProxy`-Merge, siehe
 * `features/Berechnung/calculateBerechnungRows.ts`) — alle Felder garantiert gesetzt,
 * anders als der rohe, pro Monat teilweise befüllte Eintrag (`IVorgabeValue` aus shared).
 */
export type IVorgabenGeldType = Required<IVorgabeValue>;

/** Vorgaben-Werte je Monat (Schluessel = Monat). */
export interface IVorgabenGeld {
  [key: number]: IVorgabenGeldType;
  //getMonat: (maxMonat: number) => IVorgabenGeldType;
}
