import type { BereitschaftSchichtTyp, IFahrzeit, IPers, IVorgabeBWert } from '@otto-kirchheim/nebengeld-shared';

export interface IVorgabenUEinstellungen {
  aktivierteTabs: string[];
  benoetigteZulagen?: string[];
  autoSaveEnabled?: boolean;
  autoSaveDelayMs?: number;
}

export interface IVorgabenU {
  Pers: IVorgabenUPers;
  Arbeitszeit: IVorgabenUaZ;
  Fahrzeit: IVorgabenUfZ[];
  VorgabenB: { [key: string]: IVorgabenUvorgabenB };
  Einstellungen: IVorgabenUEinstellungen;
}
export interface IVorgabenUServer {
  Pers: IVorgabenUPers;
  Arbeitszeit: IVorgabenUaZ;
  Fahrzeit: IVorgabenUfZ[];
  VorgabenB: {
    key: string;
    value: IVorgabenUvorgabenB;
  }[];
  Einstellungen: IVorgabenUEinstellungen;
}

/** Wie shared `IPers`, nur `OE` als EIN Text-Feld statt Ebenen-Array — das Formular pflegt es so;
 *  `joinOeLevels`/`splitOeInput` (`shared/lib/ressource/oeLevels.ts`, genutzt in `fieldMapper.ts`) wandeln beim Laden/Speichern. */
export interface IVorgabenUPers extends Omit<IPers, 'OE'> {
  OE: string;
}

// --- Arbeitszeiten (pro Wochentag) ---

export type SchichtBase = {
  beginn: string; // HH:mm
  ende: string; // HH:mm; Tageswechsel wird erkannt wenn ende < beginn
  pause: number; // Minuten
};

// Nur geänderte Felder zum default; arbeitsfrei ergibt sich ausschließlich über regelarbeitstage
export type SchichtOverride = Partial<SchichtBase>;

// isoWeekday 1–7 als Keys (JSON: { "5": { "ende": "13:00" } }); kein Array
export type SchichtOverrides = Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7, SchichtOverride>>;

export interface IPerWeekdaySchicht {
  aktiv: boolean; // false = inaktiv (Zeiten bleiben gespeichert)
  default: SchichtBase;
  regelarbeitstage?: number[]; // isoWeekday 1–7; Default [1,2,3,4,5]; rest → arbeitsfrei
  overrides?: SchichtOverrides; // Differenzen von default für einzelne Tage
}

// Globales Zeitpaar (für Schichten ohne Wochentag-Variation, z.B. Sonderschicht)
export interface ISchichtZeiten {
  aktiv: boolean; // false = inaktiv (Zeiten bleiben gespeichert)
  beginn: string;
  ende: string;
  pause: number;
}

export interface IVorgabenUaZ {
  frueh: IPerWeekdaySchicht; // immer vorhanden und aktiv
  spaet: IPerWeekdaySchicht; // immer vorhanden, aktiv steuert ob genutzt
  nacht: IPerWeekdaySchicht; // immer vorhanden, aktiv steuert ob genutzt
  sonder: ISchichtZeiten; // immer vorhanden, aktiv steuert ob genutzt
  fahrzeit: string; // HH:mm Dauer Wohnung ↔ Arbeit
}

export type IVorgabenUfZ = IFahrzeit;

export type { BereitschaftSchichtTyp };

/**
 * Wie shared `IVorgabeBWert`, nur mit den Optionalitäts-Garantien der hydrierten Frontend-Form
 * (analog `IVorgabenUaZ`): `Nwoche` ist bei `endeB`/`beginnN`/`endeN` immer gesetzt (nie bei
 * `beginnB` -- siehe `IZeitpunktMitWoche` in shared), `schichtenOverrides` stärker typisiert, `standard` als
 * `true`-Literal (Abwesenheit statt `false` markiert "nicht Standard").
 */
export interface IVorgabenUvorgabenB extends Omit<
  IVorgabeBWert,
  'beginnB' | 'endeB' | 'beginnN' | 'endeN' | 'schichtenOverrides' | 'standard'
> {
  [k: string]: unknown;
  beginnB: {
    tag: number;
    zeit?: string;
  };
  endeB: {
    tag: number;
    zeit?: string;
    Nwoche: boolean;
  };
  schichtenOverrides?: {
    [K in BereitschaftSchichtTyp]?: Partial<IPerWeekdaySchicht>;
  };
  beginnN: {
    tag: number;
    zeit?: string;
    Nwoche: boolean;
  };
  endeN: {
    tag: number;
    zeit?: string;
    Nwoche: boolean;
  };
  standard?: true;
}
