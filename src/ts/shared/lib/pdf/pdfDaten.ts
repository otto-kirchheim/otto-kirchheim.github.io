import type { IVorgabeValue } from '@otto-kirchheim/nebengeld-shared';

// ─── Abgeleitete Typen ────────────────────────────────────
export interface IPdfPers {
  Vorname: string;
  Nachname: string;
  Name?: string;
  PNummer: string;
  Telefon: string;
  Adress1: string;
  Adress2?: string;
  ErsteTkgSt: string;
  ErsteTkgStAdresse: string;
  Bundesland?: string;
  Betrieb: string;
  /** Organisationseinheit als Hierarchie-Ebenen; fuer die PDF-Zelle zusammengefuegt */
  OE: string[];
  Gewerk: string;
  kmArbeitsort: number;
  nBhf: string;
  kmnBhf: number;
  TB: string;
  Taetigkeit?: string;
  Entgeltgruppe?: string;
}

export interface IPdfFahrzeit {
  key: string;
  text: string;
  value: string;
}

export type IPdfVorgabenGeld = IVorgabeValue;

// ─── Gemeinsamer PDF-Body (Basis) ─────────────────────────
export interface IPdfBase {
  Jahr: number;
  Monat: number;
  VorgabenU: {
    Pers: IPdfPers;
    Fahrzeit: IPdfFahrzeit[];
  };
  VorgabenGeld: IPdfVorgabenGeld;
}
