export interface IVorgabenUEinstellungen {
  aktivierteTabs: string[];
  benoetigteZulagen?: string[];
  autoSaveEnabled?: boolean;
  autoSaveDelayMs?: number;
}

export interface IVorgabenU {
  pers: IVorgabenUPers;
  aZ: IVorgabenUaZ;
  fZ: IVorgabenUfZ[];
  vorgabenB: { [key: string]: IVorgabenUvorgabenB };
  Einstellungen: IVorgabenUEinstellungen;
}
export interface IVorgabenUServer {
  pers: IVorgabenUPers;
  aZ: IVorgabenUaZ;
  fZ: IVorgabenUfZ[];
  vorgabenB: {
    key: string;
    value: IVorgabenUvorgabenB;
  }[];
  Einstellungen: IVorgabenUEinstellungen;
}
export interface IVorgabenUPers {
  Vorname: string;
  Nachname: string;
  PNummer: string;
  Telefon: string;
  Adress1: string;
  Adress2: string;
  ErsteTkgSt: string;
  ErsteTkgStAdresse: string;
  Bundesland: string;
  Betrieb: string;
  OE: string;
  Gewerk: string;
  kmArbeitsort: number;
  nBhf: string;
  kmnBhf: number;
  TB: 'Besoldungsgruppe A 8' | 'Besoldungsgruppe A 9' | 'Tarifkraft';
}

// --- Arbeitszeiten (neues per-Wochentag-Modell) ---

export type SchichtBase = {
  beginn: string;  // HH:mm
  ende: string;    // HH:mm; Tageswechsel wird erkannt wenn ende < beginn
  pause: number;   // Minuten
};

// Nur geänderte Felder zum default; arbeitsfrei ergibt sich ausschließlich über regelarbeitstage
export type SchichtOverride = Partial<SchichtBase>;

// isoWeekday 1–7 als Keys (JSON: { "5": { "ende": "13:00" } }); kein Array
export type SchichtOverrides = Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7, SchichtOverride>>;

export interface IPerWeekdaySchicht {
  default: SchichtBase;
  regelarbeitstage?: number[];  // isoWeekday 1–7; Default [1,2,3,4,5]; rest → arbeitsfrei
  overrides?: SchichtOverrides; // Differenzen von default für einzelne Tage
}

// Globales Zeitpaar (für Schichten ohne Wochentag-Variation, z.B. Sonderschicht)
export interface ISchichtZeiten {
  beginn: string;
  ende: string;
  pause: number;
}

export interface IVorgabenUaZ {
  frueh: IPerWeekdaySchicht;   // Frühschicht (= bisherige Tagschicht) — immer vorhanden
  spaet?: IPerWeekdaySchicht;  // Spätschicht — optional, per Wochentag
  nacht?: IPerWeekdaySchicht;  // Nachtschicht — optional, per Wochentag
  sonder?: ISchichtZeiten;     // Sonderschicht — optional, globale Zeiten
  fahrzeit: string;            // HH:mm Dauer Wohnung ↔ Arbeit
}

export interface IVorgabenUfZ {
  [key: string]: string;
  key: string;
  text: string;
  value: string;
}

export type BereitschaftSchichtTyp = 'frueh' | 'spaet' | 'nacht' | 'sonder';

export interface IVorgabenUvorgabenB {
  [k: string]: unknown;
  Name: string;
  beginnB: {
    tag: number;
    zeit: string;
  };
  endeB: {
    tag: number;
    zeit: string;
    Nwoche: boolean;
  };
  // NEU: Schichtauswahl für Bereitschaftszeitraum
  schichten?: BereitschaftSchichtTyp[];
  schichtenOverrides?: {
    [K in BereitschaftSchichtTyp]?: Partial<IPerWeekdaySchicht>;
  };
  // DEPRECATED — Fallback für alte Einträge; wird bei Migration auf schichten: ['nacht'] gemappt
  nacht: boolean;
  beginnN: {
    tag: number;
    zeit: string;
    Nwoche: boolean;
  };
  endeN: {
    tag: number;
    zeit: string;
    Nwoche: boolean;
  };
  standard?: true;
}
