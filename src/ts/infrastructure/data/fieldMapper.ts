/**
 * Field-Mapper: Konvertiert zwischen Frontend-Feldnamen und Backend-API-Feldnamen.
 *
 * Strategie: Die internen Datenstrukturen (IDatenBZ, IDatenBE, etc.) bleiben unverändert.
 * Die Konvertierung passiert nur an der API-Grenze (beim Laden und Speichern).
 */

import type { IDatenBE, IDatenBZ, IDatenEWT, IDatenN } from '@/types';
import type { IBereitschaftseinsatz, IBereitschaftszeitraum } from '@otto-kirchheim/nebengeld-shared';
import type {
  BereitschaftSchichtTyp,
  IPerWeekdaySchicht,
  ISchichtZeiten,
  IVorgabenU,
  IVorgabenUaZ,
  IVorgabenUServer,
  IVorgabenUvorgabenB,
} from '@/types';
import dayjs from '../date/configDayjs';
import { formatNebengeldZulagen, normalizeNebengeldZulagen } from '@/features/Neben/utils';

// ─── Typen für Backend-Dokumente ─────────────────────────

export interface BackendBereitschaftszeitraum extends IBereitschaftszeitraum {
  User?: string;
  Monat: number;
  Jahr: number;
  updatedAt?: string;
}

export interface BackendBereitschaftseinsatz extends IBereitschaftseinsatz {
  User?: string;
  Monat: number;
  Jahr: number;
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
  /** null = EWT-Verknüpfung explizit entfernen (Backend übersetzt zu $unset) */
  EWT?: string | null;
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
  Arbeitszeit?: IVorgabenUaZ;
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

// ─── Arbeitszeit Migration (altes Flat-Format → neues Modell) ───

/** Altes Flat-Format mit 9 Strings — entspricht dem aktuellen Backend-Schema */
interface LegacyArbeitszeit {
  bT: string;
  eT: string;
  eTF: string;
  bS?: string;
  eS?: string;
  bN?: string;
  eN?: string;
  bBN?: string;
  rZ: string;
}

export function isLegacyArbeitszeit(raw: unknown): raw is LegacyArbeitszeit {
  if (typeof raw !== 'object' || raw === null) return false;
  const r = raw as Record<string, unknown>;
  // If the new structured 'frueh' field is present, treat as already migrated
  if (typeof r.frueh === 'object' && r.frueh !== null) return false;
  return 'bT' in r && typeof r.bT === 'string';
}

export function migrateArbeitszeit(raw: LegacyArbeitszeit): IVorgabenUaZ {
  const bT = raw.bT ?? '';
  const eT = raw.eT ?? '';
  const eTF = raw.eTF ?? eT;
  const freitag = eTF !== eT ? { 5: { ende: eTF, pause: 0 } as const } : undefined;
  return {
    frueh: {
      aktiv: true,
      default: { beginn: bT, ende: eT, pause: 30 },
      overrides: freitag,
    },
    spaet: { aktiv: false, default: { beginn: '14:00', ende: '22:00', pause: 30 } },
    nacht: {
      aktiv: !!raw.bN,
      default: { beginn: raw.bN ?? '19:45', ende: raw.eN ?? '06:15', pause: 45 },
    },
    sonder: {
      aktiv: !!raw.bS,
      beginn: raw.bS ?? '06:00',
      ende: raw.eS ?? '14:30',
      pause: 20,
    },
    fahrzeit: raw.rZ ?? '',
  };
}

function normalizePerWeekdaySchicht(
  raw: unknown,
  defaultBase: { beginn: string; ende: string; pause: number },
): IPerWeekdaySchicht {
  if (!raw || typeof raw !== 'object') {
    return { aktiv: false, default: defaultBase };
  }
  const r = raw as Record<string, unknown>;
  return {
    aktiv: typeof r.aktiv === 'boolean' ? r.aktiv : true,
    default: (r.default as IVorgabenUaZ['frueh']['default']) ?? defaultBase,
    regelarbeitstage: Array.isArray(r.regelarbeitstage) ? (r.regelarbeitstage as number[]) : undefined,
    overrides: r.overrides as IPerWeekdaySchicht['overrides'] | undefined,
  };
}

function normalizeSchichtZeiten(raw: unknown): ISchichtZeiten {
  const defaults = { beginn: '06:00', ende: '14:30', pause: 20 };
  if (!raw || typeof raw !== 'object') {
    return { aktiv: false, ...defaults };
  }
  const r = raw as Record<string, unknown>;
  return {
    aktiv: typeof r.aktiv === 'boolean' ? r.aktiv : true,
    beginn: typeof r.beginn === 'string' ? r.beginn : defaults.beginn,
    ende: typeof r.ende === 'string' ? r.ende : defaults.ende,
    pause: typeof r.pause === 'number' ? r.pause : defaults.pause,
  };
}

/**
 * Normalisiert beliebige Arbeitszeit-Daten (Legacy, altes Strukturformat ohne aktiv, neues Format)
 * zu einem vollständigen IVorgabenUaZ mit aktiv-Flag auf allen Schichten.
 */
export function normalizeAZ(raw: unknown): IVorgabenUaZ {
  if (!raw || typeof raw !== 'object') {
    return {
      frueh: { aktiv: true, default: { beginn: '', ende: '', pause: 30 } },
      spaet: { aktiv: false, default: { beginn: '14:00', ende: '22:00', pause: 30 } },
      nacht: { aktiv: false, default: { beginn: '19:45', ende: '06:15', pause: 45 } },
      sonder: { aktiv: false, beginn: '06:00', ende: '14:30', pause: 20 },
      fahrzeit: '',
    };
  }
  if (isLegacyArbeitszeit(raw)) return migrateArbeitszeit(raw);
  const r = raw as Record<string, unknown>;
  return {
    frueh: normalizePerWeekdaySchicht(r.frueh, { beginn: '', ende: '', pause: 30 }),
    spaet: normalizePerWeekdaySchicht(r.spaet, { beginn: '14:00', ende: '22:00', pause: 30 }),
    nacht: normalizePerWeekdaySchicht(r.nacht, { beginn: '19:45', ende: '06:15', pause: 45 }),
    sonder: normalizeSchichtZeiten(r.sonder),
    fahrzeit: typeof r.fahrzeit === 'string' ? r.fahrzeit : '',
  };
}

/** Migriert ein VorgabenB-Objekt: nacht: boolean → schichten: ['nacht'] */
function migrateVorgabenBEntry(entry: Record<string, unknown>): IVorgabenUvorgabenB {
  const result = { ...entry } as IVorgabenUvorgabenB;
  if (!result.schichten && result.nacht === true) {
    result.schichten = ['nacht'] as BereitschaftSchichtTyp[];
  }
  return result;
}

// ─── Backend → Frontend (Laden) ──────────────────────────

/**
 * Konvertiert ein Backend-Bereitschaftszeitraum-Dokument in das Frontend-Format.
 */
export function bzFromBackend(doc: BackendBereitschaftszeitraum): IDatenBZ {
  return {
    _id: doc._id,
    Beginn: doc.Beginn,
    Ende: doc.Ende,
    Pause: doc.Pause ?? 0,
  };
}

/**
 * Konvertiert ein Backend-Bereitschaftseinsatz-Dokument in das Frontend-Format.
 */
export function beFromBackend(doc: BackendBereitschaftseinsatz): IDatenBE {
  return {
    _id: doc._id,
    Bereitschaftszeitraum: Array.isArray(doc.Bereitschaftszeitraum)
      ? doc.Bereitschaftszeitraum
      : doc.Bereitschaftszeitraum
        ? [doc.Bereitschaftszeitraum as unknown as string]
        : undefined,
    Tag: dayjs(doc.Tag).format('DD.MM.YYYY'),
    Auftragsnummer: doc.Auftragsnummer,
    Beginn: doc.Beginn,
    Ende: doc.Ende,
    LRE: doc.LRE,
    PrivatKm: doc.PrivatKm,
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
  const zulagenN = doc.Zulagen.map(zulage => ({ code: zulage.Typ, value: zulage.Wert })).filter(z => z.value > 0);
  return {
    _id: doc._id,
    ewtRef: doc.EWT ?? undefined,
    tagN: dayjs(doc.Tag).format('DD.MM.YYYY'),
    beginN: doc.Beginn,
    endeN: doc.Ende,
    zulagenN,
    zulagenAnzeigeN: formatNebengeldZulagen(zulagenN),
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

  // Migriere VorgabenB: nacht: boolean → schichten: ['nacht']
  for (const key of Object.keys(vorgabenB)) {
    vorgabenB[key] = migrateVorgabenBEntry(vorgabenB[key] as Record<string, unknown>);
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
    aZ: normalizeAZ(doc.Arbeitszeit ?? null),
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
  const period = resolveYearMonth(item.Beginn, monat, jahr);

  return {
    _id: item._id,
    Monat: period.Monat,
    Jahr: period.Jahr,
    Beginn: item.Beginn,
    Ende: item.Ende,
    Pause: item.Pause,
  };
}

/**
 * Konvertiert einen Frontend-BE-Eintrag in das Backend-Format.
 */
export function beToBackend(item: IDatenBE, monat: number, jahr: number): Omit<BackendBereitschaftseinsatz, 'User'> {
  const period = resolveYearMonth(item.Tag, monat, jahr, 'DD.MM.YYYY');

  return {
    _id: item._id,
    Bereitschaftszeitraum: item.Bereitschaftszeitraum,
    Monat: period.Monat,
    Jahr: period.Jahr,
    Tag: dayjs(item.Tag, 'DD.MM.YYYY').toISOString(),
    Auftragsnummer: item.Auftragsnummer,
    Beginn: item.Beginn,
    Ende: item.Ende,
    LRE: item.LRE,
    PrivatKm: item.PrivatKm,
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
    // Leere Strings explizit mitsenden: `undefined` fällt bei JSON.stringify weg,
    // wodurch ein Update gelöschte Zeiten nicht überschreiben würde (alter Wert bliebe erhalten).
    Einsatzort: item.eOrtE,
    Schicht: item.schichtE,
    abWE: item.abWE,
    ab1E: item.ab1E,
    anEE: item.anEE,
    beginE: item.beginE,
    endeE: item.endeE,
    abEE: item.abEE,
    an1E: item.an1E,
    anWE: item.anWE,
    berechnen: item.berechnen,
  };
}

/**
 * Konvertiert einen Frontend-Nebengeld-Eintrag in das Backend-Format.
 */
export function nebengeldToBackend(item: IDatenN, monat: number, jahr: number): Omit<BackendNebengeld, 'User'> {
  const period = resolveYearMonth(item.tagN, monat, jahr, 'DD.MM.YYYY');
  const normalizedZulagen = normalizeNebengeldZulagen(item);
  const zulagen: BackendNebengeld['Zulagen'] = normalizedZulagen.map(zulage => ({
    Typ: zulage.code,
    Wert: zulage.value,
  }));
  return {
    _id: item._id,
    // null statt undefined: undefined fällt bei JSON.stringify weg, das Entfernen der
    // EWT-Verknüpfung käme nie am Server an. null wird dort zu $unset übersetzt.
    EWT: item.ewtRef || null,
    Monat: period.Monat,
    Jahr: period.Jahr,
    Tag: dayjs(item.tagN, 'DD.MM.YYYY').toISOString(),
    Beginn: item.beginN,
    Ende: item.endeN,
    // Leerstring explizit mitsenden, damit eine gelöschte Auftragsnummer beim Update auch serverseitig geleert wird.
    Auftragsnummer: item.auftragN,
    Zulagen: zulagen,
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
    vorgabenB[entry.key] = migrateVorgabenBEntry(entry.value as Record<string, unknown>);
  }
  return {
    pers: server.pers,
    aZ: normalizeAZ(server.aZ),
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
