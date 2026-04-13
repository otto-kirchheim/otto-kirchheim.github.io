/**
 * Field-Mapper: Konvertiert zwischen Frontend-Feldnamen und Backend-API-Feldnamen.
 *
 * Strategie: Die internen Datenstrukturen (IDatenBZ, IDatenBE, etc.) bleiben unverändert.
 * Die Konvertierung passiert nur an der API-Grenze (beim Laden und Speichern).
 */

import type { IDatenBE, IDatenBZ, IDatenEWT, IDatenN } from '../interfaces';
import type { IVorgabenU, IVorgabenUServer } from '../interfaces';
import dayjs from './configDayjs';

// ─── Typen für Backend-Dokumente ─────────────────────────

export interface BackendBereitschaftszeitraum {
  _id?: string;
  User?: string;
  Monat: number;
  Jahr: number;
  Beginn: string; // ISO-Date
  Ende: string; // ISO-Date
  Pause?: number;
  updatedAt?: string;
}

export interface BackendBereitschaftseinsatz {
  _id?: string;
  User?: string;
  Bereitschaftszeitraum?: string;
  Monat: number;
  Jahr: number;
  Tag: string; // ISO-Date
  Auftragsnummer: string;
  Beginn: string;
  Ende: string;
  LRE: string;
  PrivatKm: number;
  updatedAt?: string;
}

export interface BackendEWT {
  _id?: string;
  User?: string;
  Monat: number;
  Jahr: number;
  Tag: string; // ISO-Date
  Buchungstag?: string; // ISO-Date
  Einsatzort?: string;
  Schicht: string;
  abWE?: string;
  ab1E?: string;
  anEE?: string;
  beginE?: string;
  endeE?: string;
  abEE?: string;
  an1E?: string;
  anWE?: string;
  berechnen?: boolean;
  updatedAt?: string;
}

export interface BackendNebengeld {
  _id?: string;
  User?: string;
  EWT?: string;
  Monat: number;
  Jahr: number;
  Tag: string; // ISO-Date
  Beginn: string;
  Ende: string;
  Auftragsnummer?: string;
  Zulagen: { Typ: string; Wert: number }[];
  updatedAt?: string;
}

export interface BackendUserProfile {
  _id?: string;
  User: string;
  Pers: {
    Vorname: string;
    Nachname: string;
    PNummer: string;
    Telefon: string;
    Adress1: string;
    Adress2?: string;
    ErsteTkgSt: string;
    ErsteTkgStAdresse: string;
    Bundesland?: string;
    Betrieb: string;
    OE: string;
    Gewerk: string;
    kmArbeitsort: number;
    nBhf: string;
    kmnBhf: number;
    TB: string;
  };
  Fahrzeit: { key: string; text: string; value: string }[];
  Arbeitszeit: {
    bT: string;
    eT: string;
    eTF: string;
    bS: string;
    eS: string;
    bN: string;
    eN: string;
    bBN: string;
    rZ: string;
  };
  VorgabenB: { key: string; value: Record<string, unknown> }[];
  Einstellungen: {
    aktivierteTabs: string[];
    benoetigteZulagen?: string[];
    autoSaveEnabled?: boolean;
    autoSaveDelayMs?: number;
  };
  updatedAt?: string;
}

export interface BackendVorgabe {
  _id: number; // Jahr
  Vorgaben: { key: number; value: Record<string, number | undefined> }[];
}

// ─── Backend → Frontend (Laden) ──────────────────────────

/**
 * Konvertiert ein Backend-Bereitschaftszeitraum-Dokument in das Frontend-Format.
 */
export function bzFromBackend(doc: BackendBereitschaftszeitraum): IDatenBZ {
  return {
    _id: doc._id,
    beginB: doc.Beginn,
    endeB: doc.Ende,
    pauseB: doc.Pause ?? 0,
  };
}

/**
 * Konvertiert ein Backend-Bereitschaftseinsatz-Dokument in das Frontend-Format.
 */
export function beFromBackend(doc: BackendBereitschaftseinsatz): IDatenBE {
  return {
    _id: doc._id,
    bereitschaftszeitraumBE: doc.Bereitschaftszeitraum,
    tagBE: dayjs(doc.Tag).format('DD.MM.YYYY'),
    auftragsnummerBE: doc.Auftragsnummer,
    beginBE: doc.Beginn,
    endeBE: doc.Ende,
    lreBE: doc.LRE as IDatenBE['lreBE'],
    privatkmBE: doc.PrivatKm,
  };
}

/**
 * Konvertiert ein Backend-EWT-Dokument in das Frontend-Format.
 */
export function ewtFromBackend(doc: BackendEWT): IDatenEWT {
  return {
    _id: doc._id,
    tagE: dayjs(doc.Tag).format('YYYY-MM-DD'),
    buchungstagE: dayjs(doc.Buchungstag ?? doc.Tag).format('YYYY-MM-DD'),
    eOrtE: doc.Einsatzort ?? '',
    schichtE: doc.Schicht,
    abWE: doc.abWE ?? '',
    ab1E: doc.ab1E ?? '',
    anEE: doc.anEE ?? '',
    beginE: doc.beginE ?? '',
    endeE: doc.endeE ?? '',
    abEE: doc.abEE ?? '',
    an1E: doc.an1E ?? '',
    anWE: doc.anWE ?? '',
    berechnen: doc.berechnen ?? true,
  };
}

/**
 * Konvertiert ein Backend-Nebengeld-Dokument in das Frontend-Format.
 * Die Zulagen-Array-Struktur wird auf das flache Frontend-Format gemappt.
 */
export function nebengeldFromBackend(doc: BackendNebengeld): IDatenN {
  // Suche nach Zulage "040" für die anzahl040N
  const zulage040 = doc.Zulagen.find(z => z.Typ === '040');
  return {
    _id: doc._id,
    ewtRef: doc.EWT,
    tagN: dayjs(doc.Tag).format('DD.MM.YYYY'),
    beginN: doc.Beginn,
    endeN: doc.Ende,
    anzahl040N: zulage040?.Wert ?? 0,
    auftragN: doc.Auftragsnummer ?? '',
  };
}

/**
 * Konvertiert ein Backend-UserProfile in das Frontend-Format (IVorgabenU).
 * Backend: Pers, Arbeitszeit, Fahrzeit, VorgabenB (Array), Einstellungen
 * Frontend: pers, aZ, fZ, vorgabenB (Map)
 */
export function userProfileFromBackend(doc: BackendUserProfile): IVorgabenU {
  // VorgabenB: Array [{key, value}] → Map {key: value}
  const vorgabenB: IVorgabenU['vorgabenB'] = {};
  if (doc.VorgabenB) {
    for (const entry of doc.VorgabenB) {
      vorgabenB[entry.key] = entry.value as IVorgabenU['vorgabenB'][string];
    }
  }

  return {
    pers: {
      Vorname: doc.Pers.Vorname ?? '',
      Nachname: doc.Pers.Nachname ?? '',
      PNummer: doc.Pers.PNummer ?? '',
      Telefon: doc.Pers.Telefon ?? '',
      Adress1: doc.Pers.Adress1 ?? '',
      Adress2: doc.Pers.Adress2 ?? '',
      ErsteTkgSt: doc.Pers.ErsteTkgSt ?? '',
      ErsteTkgStAdresse: doc.Pers.ErsteTkgStAdresse ?? '',
      Bundesland: doc.Pers.Bundesland ?? '',
      Betrieb: doc.Pers.Betrieb ?? '',
      OE: doc.Pers.OE ?? '',
      Gewerk: doc.Pers.Gewerk ?? '',
      kmArbeitsort: doc.Pers.kmArbeitsort ?? 0,
      nBhf: doc.Pers.nBhf ?? '',
      kmnBhf: doc.Pers.kmnBhf ?? 0,
      TB: (doc.Pers.TB as IVorgabenU['pers']['TB']) ?? 'Tarifkraft',
    },
    aZ: {
      bBN: doc.Arbeitszeit?.bBN ?? '',
      bN: doc.Arbeitszeit?.bN ?? '',
      bS: doc.Arbeitszeit?.bS ?? '',
      bT: doc.Arbeitszeit?.bT ?? '',
      eN: doc.Arbeitszeit?.eN ?? '',
      eS: doc.Arbeitszeit?.eS ?? '',
      eT: doc.Arbeitszeit?.eT ?? '',
      eTF: doc.Arbeitszeit?.eTF ?? '',
      rZ: doc.Arbeitszeit?.rZ ?? '',
    },
    fZ: doc.Fahrzeit ?? [],
    vorgabenB,
    Einstellungen: {
      aktivierteTabs: doc.Einstellungen?.aktivierteTabs ?? [],
      benoetigteZulagen: doc.Einstellungen?.benoetigteZulagen ?? [],
      autoSaveEnabled: doc.Einstellungen?.autoSaveEnabled ?? true,
      autoSaveDelayMs: doc.Einstellungen?.autoSaveDelayMs ?? 10000,
    },
  };
}

/**
 * Konvertiert Backend-Vorgaben in das Frontend-Format (IVorgabenGeld).
 * Backend: { _id: Jahr, Vorgaben: [{key, value}] }
 * Frontend: { [monat]: IVorgabenGeldType }
 */
export function vorgabenFromBackend(doc: BackendVorgabe): Record<number, Record<string, number>> {
  const result: Record<number, Record<string, number>> = {};
  if (doc.Vorgaben) {
    for (const entry of doc.Vorgaben) {
      const cleanValue: Record<string, number> = {};
      for (const [k, v] of Object.entries(entry.value)) {
        if (v !== undefined) cleanValue[k] = v;
      }
      result[entry.key] = cleanValue;
    }
  }
  return result;
}

// ─── Frontend → Backend (Speichern) ──────────────────────

function resolveYearMonth(value: string, fallbackMonat: number, fallbackJahr: number, format?: string) {
  const parsed = format ? dayjs(value, format, true) : dayjs(value);
  if (!parsed.isValid()) {
    return { Monat: fallbackMonat, Jahr: fallbackJahr };
  }

  return {
    Monat: parsed.month() + 1,
    Jahr: parsed.year(),
  };
}

/**
 * Konvertiert einen Frontend-BZ-Eintrag in das Backend-Format.
 */
export function bzToBackend(item: IDatenBZ, monat: number, jahr: number): Omit<BackendBereitschaftszeitraum, 'User'> {
  const period = resolveYearMonth(item.beginB, monat, jahr);

  return {
    _id: item._id,
    Monat: period.Monat,
    Jahr: period.Jahr,
    Beginn: item.beginB,
    Ende: item.endeB,
    Pause: item.pauseB,
  };
}

/**
 * Konvertiert einen Frontend-BE-Eintrag in das Backend-Format.
 */
export function beToBackend(item: IDatenBE, monat: number, jahr: number): Omit<BackendBereitschaftseinsatz, 'User'> {
  const period = resolveYearMonth(item.tagBE, monat, jahr, 'DD.MM.YYYY');

  return {
    _id: item._id,
    Bereitschaftszeitraum: item.bereitschaftszeitraumBE,
    Monat: period.Monat,
    Jahr: period.Jahr,
    Tag: dayjs(item.tagBE, 'DD.MM.YYYY').toISOString(),
    Auftragsnummer: item.auftragsnummerBE,
    Beginn: item.beginBE,
    Ende: item.endeBE,
    LRE: item.lreBE,
    PrivatKm: item.privatkmBE,
  };
}

/**
 * Konvertiert einen Frontend-EWT-Eintrag in das Backend-Format.
 */
export function ewtToBackend(item: IDatenEWT, monat: number, jahr: number): Omit<BackendEWT, 'User'> {
  const buchungstag = item.buchungstagE || item.tagE;
  const period = resolveYearMonth(item.tagE, monat, jahr, 'YYYY-MM-DD');

  return {
    _id: item._id,
    Monat: period.Monat,
    Jahr: period.Jahr,
    Tag: dayjs(item.tagE).toISOString(),
    Buchungstag: dayjs(buchungstag).toISOString(),
    Einsatzort: item.eOrtE || undefined,
    Schicht: item.schichtE,
    abWE: item.abWE || undefined,
    ab1E: item.ab1E || undefined,
    anEE: item.anEE || undefined,
    beginE: item.beginE || undefined,
    endeE: item.endeE || undefined,
    abEE: item.abEE || undefined,
    an1E: item.an1E || undefined,
    anWE: item.anWE || undefined,
    berechnen: item.berechnen,
  };
}

/**
 * Konvertiert einen Frontend-Nebengeld-Eintrag in das Backend-Format.
 */
export function nebengeldToBackend(item: IDatenN, monat: number, jahr: number): Omit<BackendNebengeld, 'User'> {
  const period = resolveYearMonth(item.tagN, monat, jahr, 'DD.MM.YYYY');
  const zulagen: BackendNebengeld['Zulagen'] = [];
  if (item.anzahl040N > 0) {
    zulagen.push({ Typ: '040', Wert: item.anzahl040N });
  }
  return {
    _id: item._id,
    EWT: item.ewtRef || undefined,
    Monat: period.Monat,
    Jahr: period.Jahr,
    Tag: dayjs(item.tagN, 'DD.MM.YYYY').toISOString(),
    Beginn: item.beginN,
    Ende: item.endeN,
    Auftragsnummer: item.auftragN || undefined,
    Zulagen: zulagen.length > 0 ? zulagen : [{ Typ: '040', Wert: 0 }],
  };
}

/**
 * Konvertiert Frontend IVorgabenU in das Backend UserProfile-Update-Format.
 * Frontend: pers, aZ, fZ, vorgabenB (Map)
 * Backend: Pers, Arbeitszeit, Fahrzeit, VorgabenB (Array)
 */
export function userProfileToBackend(data: IVorgabenU): Omit<BackendUserProfile, '_id' | 'User'> {
  // VorgabenB: Map {key: value} → Array [{key, value}]
  const vorgabenBArray = Object.entries(data.vorgabenB).map(([key, value]) => ({
    key,
    value: value as Record<string, unknown>,
  }));

  return {
    Pers: data.pers,
    Arbeitszeit: data.aZ,
    Fahrzeit: data.fZ,
    VorgabenB: vorgabenBArray,
    Einstellungen: data.Einstellungen,
  };
}

// ─── IVorgabenU ↔ IVorgabenUServer Konvertierung ────────

/**
 * Konvertiert IVorgabenUServer (Array-Format) → IVorgabenU (Map-Format).
 * Wird verwendet, wenn der Server das Array-Format für vorgabenB zurückgibt.
 */
export function vorgabenUFromServer(server: IVorgabenUServer): IVorgabenU {
  const vorgabenB: IVorgabenU['vorgabenB'] = {};
  for (const entry of server.vorgabenB) {
    vorgabenB[entry.key] = entry.value;
  }
  return {
    pers: server.pers,
    aZ: server.aZ,
    fZ: server.fZ,
    vorgabenB,
    Einstellungen: server.Einstellungen,
  };
}

// ─── Hilfsfunktionen ─────────────────────────────────────

export interface FlatMappedDocs<TFrontend> {
  data: TFrontend[];
  maxUpdatedAt: string | null;
}

export function flatMapDocs<TBackend extends { updatedAt?: string }, TFrontend>(
  docs: TBackend[],
  mapper: (doc: TBackend) => TFrontend,
): FlatMappedDocs<TFrontend> {
  let maxUpdatedAt: string | null = null;
  const data = docs.map(doc => {
    if (doc.updatedAt && (!maxUpdatedAt || doc.updatedAt > maxUpdatedAt)) {
      maxUpdatedAt = doc.updatedAt;
    }
    return mapper(doc);
  });

  return { data, maxUpdatedAt };
}
