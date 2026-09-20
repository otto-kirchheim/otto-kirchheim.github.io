import type {
  IBereitschaftseinsatz,
  IBereitschaftszeitraum,
  IEntgeltausgleich,
  INebengeld,
  IVorgabeValue,
} from '@otto-kirchheim/nebengeld-shared';

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

// ─── Daten-Formate pro Ressource ─────────────────────────

// `Dauer` wird erst durch `bzAbgeleiteteWerte()` (abgeleiteteWerte.ts) berechnet, deshalb optional
// statt vom Typsystem erzwungen. Bewusst `number` (Minuten), nicht `"HH:mm"` wie bei EWT.
// `Pause` bleibt optional (statt über `Required` erzwungen): `generatePDF` setzt eine 0-Pause bewusst
// auf `undefined`, damit die Spalte leer bleibt statt „0" zu drucken; `bzAbgeleiteteWerte()` rechnet
// mit `?? 0` weiter.
export type IPdfBereitschaftszeitraum = Required<Omit<IBereitschaftszeitraum, '_id' | 'Pause'>> & {
  Pause?: number | undefined;
  Dauer?: number;
};

// `PrivatKmBetrag` (Euro, Tarifkraft-/Beamter-Satz aus VorgabenGeld) ist wie `Dauer` optional.
// `PrivatKm` fehlt hier bewusst im `Required`: gedruckt wird je Person nur eine der beiden Spalten
// (Tarifkraft: rohe km / Beamter: Euro-Betrag), siehe `beAbgeleiteteWerte()`.
export type IPdfBereitschaftseinsatz = Required<
  Omit<IBereitschaftseinsatz, '_id' | 'Bereitschaftszeitraum' | 'Pause' | 'PrivatKm'>
> & {
  Pause?: number | undefined;
  Dauer?: number;
  PrivatKmBetrag?: number;
};

export interface IPdfEWT {
  Buchungstag: string;
  Einsatzort: string;
  Schicht: string;
  abWE?: string;
  ab1E?: string;
  anEE?: string;
  beginE?: string;
  endeE?: string;
  abEE?: string;
  an1E?: string;
  anWE?: string;
  berechnen: boolean;
  // Vorberechnete Werte, erst durch `ewtAbgeleiteteWerte()` (abgeleiteteWerte.ts) berechnet,
  // deshalb optional statt vom Typsystem erzwungen. Renderer-seitig immer vorhanden, sobald
  // `ewtAbgeleiteteWerte()` durchgelaufen ist.
  DauerWohnung?: string;
  DauerErsteTkgSt?: string;
  Wohnung8bis14?: boolean;
  Wohnung14bis24?: boolean;
  WohnungUeber24?: boolean;
  BeamterUeber8Wohnung?: boolean;
  TkgSt8bis24?: boolean;
  TkgStUeber24?: boolean;
}

export type IEwtPdfBody = {
  Daten: {
    EWT: IPdfEWT[];
  };
};

// `Arbeitszeit` wird erst durch `ezAbgeleiteteWerte()` (abgeleiteteWerte.ts) berechnet, deshalb
// optional statt vom Typsystem erzwungen.
export type IPdfNebengeld = Required<Omit<INebengeld, '_id' | 'EWT'>> & { Arbeitszeit?: string };

export type IPdfEA = Required<Omit<IEntgeltausgleich, '_id' | 'EWT'>>;

// ─── Komplette PDF-Body-Typen ─────────────────────────────

export interface IBereitschaftszeitraumPdfBody extends IPdfBase {
  Daten: {
    BZ: IPdfBereitschaftszeitraum[];
    BE?: IPdfBereitschaftseinsatz[];
  };
  // Inline statt Import von `BereitschaftszulageWerte` (abgeleiteteWerte.ts) -- diese Datei
  // importiert bereits Typen VON hier (IPdfBereitschaftseinsatz etc.), ein Rückimport würde
  // einen Zyklus erzeugen. Struktur muss manuell synchron gehalten werden.
  Bereitschaftszulage?: {
    TarifBeamter?: 'Tarifkraft' | 'Beamter';
    BereitschaftsMinuten?: number;
    SummeTarif?: number;
    SummeBeamter1?: number;
    SummeBeamter2?: number;
    SummeBeamter3?: number;
    GeldwertBeamter?: number;
  };
}

export interface INebengeldPdfBody extends IPdfBase {
  Daten: {
    N: IPdfNebengeld[];
  };
}

export interface IEntgeltausgleichPdfBody extends IPdfBase {
  Daten: {
    EA: IPdfEA[];
  };
}
