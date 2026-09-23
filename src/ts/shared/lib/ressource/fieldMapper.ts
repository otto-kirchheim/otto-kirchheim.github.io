/**
 * Field-Mapper: Konvertiert zwischen Frontend-Feldnamen und Backend-API-Feldnamen.
 *
 * Strategie: Die internen Datenstrukturen (IDatenBZ, IDatenBE, etc.) bleiben unverändert.
 * Die Konvertierung passiert nur an der API-Grenze (beim Laden und Speichern).
 */

import type { IDatenBE, IDatenBZ, IDatenEA, IDatenEWT, IDatenN } from '@/types';
import type {
  IBereitschaftseinsatz,
  IBereitschaftszeitraum,
  IEinsatzwechseltaetigkeit,
  IEntgeltausgleich,
  IFahrzeit,
  INebengeld,
  IPers,
} from '@otto-kirchheim/nebengeld-shared';
import type {
  BereitschaftSchichtTyp,
  IPerWeekdaySchicht,
  ISchichtZeiten,
  IVorgabenU,
  IVorgabenUaZ,
  IVorgabenUServer,
  IVorgabenUvorgabenB,
} from '@/types';
import { joinOeLevels, splitOeInput } from './oeLevels';
import dayjs from '@/shared/lib/date/configDayjs';
import { formatNebengeldZulagen, normalizeNebengeldZulagen } from '@/shared/lib/zulagen/nebengeldZulagen';

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

export interface BackendEWT extends IEinsatzwechseltaetigkeit {
  User?: string;
  Monat: number;
  Jahr: number;
  updatedAt?: string;
}

export interface BackendNebengeld extends INebengeld {
  User?: string;
  Monat: number;
  Jahr: number;
  updatedAt?: string;
}

export interface BackendEA extends IEntgeltausgleich {
  User?: string;
  Monat: number;
  Jahr: number;
  updatedAt?: string;
}

export interface BackendUserProfile {
  _id?: string;
  User: string;
  Pers: IPers;
  Fahrzeit: IFahrzeit[];
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

/** Altes Flat-Format mit 9 Strings; das Backend kennt es nur noch als Legacy-Felder (`LEGACY_ARBEITSZEIT_FIELDS`). */
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

/**
 * Erkennt das alte flache Arbeitszeit-Format (`bT` als String, ohne strukturiertes `frueh`).
 *
 * @param raw - Beliebiger Wert aus Server oder Storage.
 * @returns Type Guard auf `LegacyArbeitszeit`.
 */
export function isLegacyArbeitszeit(raw: unknown): raw is LegacyArbeitszeit {
  if (typeof raw !== 'object' || raw === null) return false;
  const r = raw as Record<string, unknown>;
  // Strukturiertes `frueh` vorhanden: bereits migriert.
  if (typeof r.frueh === 'object' && r.frueh !== null) return false;
  return 'bT' in r && typeof r.bT === 'string';
}

/**
 * Wandelt das alte flache Arbeitszeit-Format in `IVorgabenUaZ` um. Weicht `eTF` (Freitag) von `eT`
 * ab, wird daraus ein Freitags-Override (Wochentag 5, ohne Pause); Nacht und Sonder sind nur aktiv,
 * wenn `bN` bzw. `bS` gesetzt sind.
 *
 * @param raw - Altes Format.
 * @returns Neues Modell mit `aktiv`-Flag je Schicht.
 */
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

/**
 * Normalisiert eine Schicht mit Wochentags-Overrides. Fehlt die Schicht ganz, ist sie inaktiv mit
 * `defaultBase`; fehlt nur `aktiv`, gilt sie als aktiv.
 *
 * @param raw - Rohwert der Schicht.
 * @param defaultBase - Standardzeiten (Beginn/Ende `HH:mm`, Pause in Minuten).
 * @returns Vollstaendige Schicht.
 */
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

/**
 * Normalisiert die Sonderschicht (feste Zeiten ohne Wochentags-Overrides); Standard 06:00-14:30, 20 Min. Pause.
 *
 * @param raw - Rohwert der Sonderschicht.
 * @returns Vollstaendige Schicht; fehlt sie ganz, inaktiv, sonst `aktiv` standardmaessig `true`.
 */
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
 *
 * @param raw - Rohwert aus Server oder Storage; bei fehlendem/ungueltigem Wert gelten die Standardzeiten.
 * @returns Vollstaendiges `IVorgabenUaZ`.
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

/**
 * Migriert ein VorgabenB-Objekt: nacht: boolean → schichten: ['nacht'].
 *
 * @param entry - VorgabenB-Eintrag, evtl. im alten Format.
 * @returns Kopie mit `schichten`, sofern `nacht === true` und `schichten` fehlte.
 */
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
 *
 * @param doc - Backend-Dokument.
 * @returns Frontend-Zeile; fehlende `Pause` wird `0`.
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
 *
 * @param doc - Backend-Dokument.
 * @returns Frontend-Zeile mit `Tag` als `DD.MM.YYYY`; ein einzelner `Bereitschaftszeitraum` wird zum Array.
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
 *
 * @param doc - Backend-Dokument.
 * @returns Frontend-Zeile mit `Tag`/`Buchungstag` als `YYYY-MM-DD` (Buchungstag Standard: `Tag`); fehlende Zeiten werden leere Strings.
 */
export function ewtFromBackend(doc: BackendEWT): IDatenEWT {
  return {
    _id: doc._id,
    Tag: dayjs(doc.Tag).format('YYYY-MM-DD'),
    Buchungstag: dayjs(doc.Buchungstag ?? doc.Tag).format('YYYY-MM-DD'),
    Einsatzort: doc.Einsatzort ?? '',
    Schicht: doc.Schicht,
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
 * Konvertiert ein Backend-Nebengeld-Dokument in das Frontend-Format. Zulagen mit `Wert` 0 entfallen;
 * `zulagenAnzeigeN` wird daraus fuer die Tabelle abgeleitet.
 *
 * @param doc - Backend-Dokument.
 * @returns Frontend-Zeile mit `Tag` als `DD.MM.YYYY`.
 */
export function nebengeldFromBackend(doc: BackendNebengeld): IDatenN {
  const Zulagen = doc.Zulagen.map(zulage => ({ Typ: zulage.Typ, Wert: zulage.Wert })).filter(z => z.Wert > 0);
  return {
    _id: doc._id,
    EWT: doc.EWT ?? undefined,
    Tag: dayjs(doc.Tag).format('DD.MM.YYYY'),
    Beginn: doc.Beginn,
    Ende: doc.Ende,
    Zulagen,
    zulagenAnzeigeN: formatNebengeldZulagen(Zulagen),
    Auftragsnummer: doc.Auftragsnummer ?? '',
  };
}

/**
 * Konvertiert ein Backend-Entgeltausgleich-Dokument in das Frontend-Format.
 *
 * @param doc - Backend-Dokument.
 * @returns Frontend-Zeile mit `Tag` als `DD.MM.YYYY`; fehlende Texte werden leere Strings.
 */
export function eaFromBackend(doc: BackendEA): IDatenEA {
  return {
    _id: doc._id,
    EWT: doc.EWT ?? undefined,
    Tag: dayjs(doc.Tag).format('DD.MM.YYYY'),
    Dauer: doc.Dauer,
    Taetigkeit: doc.Taetigkeit ?? '',
    Entgeltgruppe: doc.Entgeltgruppe ?? '',
  };
}

/**
 * Konvertiert ein Backend-UserProfile in das Frontend-Format (IVorgabenU). Die Container-Keys
 * (Pers, Arbeitszeit, Fahrzeit, VorgabenB, Einstellungen) sind gleich; `VorgabenB` ist im Backend
 * ein Array, im Frontend eine Map. Fehlende Felder erhalten Standardwerte.
 *
 * @param doc - Backend-UserProfile.
 * @returns Vollstaendiges `IVorgabenU`; `OE` als ein Textfeld, Arbeitszeit normalisiert.
 */
export function userProfileFromBackend(doc: BackendUserProfile): IVorgabenU {
  // VorgabenB: Array [{key, value}] → Map {key: value}
  const VorgabenB: IVorgabenU['VorgabenB'] = {};
  if (doc.VorgabenB) {
    for (const entry of doc.VorgabenB) {
      VorgabenB[entry.key] = entry.value as IVorgabenU['VorgabenB'][string];
    }
  }

  // Migriere VorgabenB: nacht: boolean → schichten: ['nacht']
  for (const key of Object.keys(VorgabenB)) {
    VorgabenB[key] = migrateVorgabenBEntry(VorgabenB[key] as Record<string, unknown>);
  }

  return {
    Pers: {
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
      OE: joinOeLevels(doc.Pers.OE ?? []),
      Gewerk: doc.Pers.Gewerk ?? '',
      kmArbeitsort: doc.Pers.kmArbeitsort ?? 0,
      nBhf: doc.Pers.nBhf ?? '',
      kmnBhf: doc.Pers.kmnBhf ?? 0,
      TB: (doc.Pers.TB as IVorgabenU['Pers']['TB']) ?? 'Tarifkraft',
      Taetigkeit: doc.Pers.Taetigkeit ?? undefined,
      Entgeltgruppe: doc.Pers.Entgeltgruppe ?? undefined,
    },
    Arbeitszeit: normalizeAZ(doc.Arbeitszeit ?? null),
    Fahrzeit: (doc.Fahrzeit ?? []).map(fz => ({ key: fz.key, text: fz.text, value: fz.value })),
    VorgabenB,
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
 *
 * @param doc - Backend-Dokument eines Jahres.
 * @returns Werte je Monat (`key`); `undefined`-Werte entfallen.
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

/**
 * Bestimmt Monat und Jahr eines Datumswerts.
 *
 * @param value - Datumswert.
 * @param fallbackMonat - Monat bei ungueltigem Datum.
 * @param fallbackJahr - Jahr bei ungueltigem Datum.
 * @param format - Optionales Format; dann strikt geparst.
 * @returns Monat (1-12) und Jahr.
 */
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
 *
 * @param item - Frontend-Zeile.
 * @param monat - Fallback-Monat bei ungueltigem `Beginn`.
 * @param jahr - Fallback-Jahr bei ungueltigem `Beginn`.
 * @returns Backend-Dokument ohne `User`; `Monat`/`Jahr` stammen aus `Beginn`.
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
 *
 * @param item - Frontend-Zeile.
 * @param monat - Fallback-Monat bei ungueltigem `Tag`.
 * @param jahr - Fallback-Jahr bei ungueltigem `Tag`.
 * @returns Backend-Dokument ohne `User`; `Tag` als ISO-String, `Monat`/`Jahr` aus `Tag`.
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
 *
 * @param item - Frontend-Zeile.
 * @param monat - Fallback-Monat bei ungueltigem `Tag`.
 * @param jahr - Fallback-Jahr bei ungueltigem `Tag`.
 * @returns Backend-Dokument ohne `User`; `Tag`/`Buchungstag` als ISO-String (Buchungstag Standard: `Tag`).
 */
export function ewtToBackend(item: IDatenEWT, monat: number, jahr: number): Omit<BackendEWT, 'User'> {
  const buchungstag = item.Buchungstag || item.Tag;
  const period = resolveYearMonth(item.Tag, monat, jahr, 'YYYY-MM-DD');

  return {
    _id: item._id,
    Monat: period.Monat,
    Jahr: period.Jahr,
    Tag: dayjs(item.Tag).toISOString(),
    Buchungstag: dayjs(buchungstag).toISOString(),
    // Leere Strings explizit mitsenden: `undefined` fällt bei JSON.stringify weg,
    // wodurch ein Update gelöschte Zeiten nicht überschreiben würde (alter Wert bliebe erhalten).
    Einsatzort: item.Einsatzort,
    Schicht: item.Schicht,
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
 *
 * @param item - Frontend-Zeile.
 * @param monat - Fallback-Monat bei ungueltigem `Tag`.
 * @param jahr - Fallback-Jahr bei ungueltigem `Tag`.
 * @returns Backend-Dokument ohne `User`; `EWT` ist `null` ohne Verknuepfung, `Zulagen` sind normalisiert.
 */
export function nebengeldToBackend(item: IDatenN, monat: number, jahr: number): Omit<BackendNebengeld, 'User'> {
  const period = resolveYearMonth(item.Tag, monat, jahr, 'DD.MM.YYYY');
  const normalizedZulagen = normalizeNebengeldZulagen(item);
  const zulagen: BackendNebengeld['Zulagen'] = normalizedZulagen.map(zulage => ({
    Typ: zulage.Typ,
    Wert: zulage.Wert,
  }));
  return {
    _id: item._id,
    // null statt undefined: undefined fällt bei JSON.stringify weg, das Entfernen der
    // EWT-Verknüpfung käme nie am Server an. null wird dort zu $unset übersetzt.
    EWT: item.EWT || null,
    Monat: period.Monat,
    Jahr: period.Jahr,
    Tag: dayjs(item.Tag, 'DD.MM.YYYY').toISOString(),
    Beginn: item.Beginn,
    Ende: item.Ende,
    // Leerstring explizit mitsenden, damit eine gelöschte Auftragsnummer beim Update auch serverseitig geleert wird.
    Auftragsnummer: item.Auftragsnummer,
    Zulagen: zulagen,
  };
}

/**
 * Konvertiert einen Frontend-EA-Eintrag in das Backend-Format.
 *
 * @param item - Frontend-Zeile.
 * @param monat - Fallback-Monat bei ungueltigem `Tag`.
 * @param jahr - Fallback-Jahr bei ungueltigem `Tag`.
 * @returns Backend-Dokument ohne `User`; `EWT` ist `null` ohne Verknuepfung.
 */
export function eaToBackend(item: IDatenEA, monat: number, jahr: number): Omit<BackendEA, 'User'> {
  const period = resolveYearMonth(item.Tag, monat, jahr, 'DD.MM.YYYY');
  return {
    _id: item._id,
    // null statt undefined: undefined fällt bei JSON.stringify weg, das Entfernen der
    // EWT-Verknüpfung käme nie am Server an. null wird dort zu $unset übersetzt.
    EWT: item.EWT || null,
    Monat: period.Monat,
    Jahr: period.Jahr,
    Tag: dayjs(item.Tag, 'DD.MM.YYYY').toISOString(),
    Dauer: item.Dauer,
    // Leerstring explizit mitsenden, damit ein gelöschtes Feld beim Update auch serverseitig geleert wird.
    Taetigkeit: item.Taetigkeit,
    Entgeltgruppe: item.Entgeltgruppe,
  };
}

/**
 * Konvertiert Frontend IVorgabenU in das Backend UserProfile-Update-Format.
 * VorgabenB: Map (Frontend-intern) ↔ Array (Backend-Wire-Format).
 *
 * @param data - Profil im Frontend-Format.
 * @returns Update-Payload ohne `_id`/`User`; `Pers.OE` als Ebenen-Array.
 */
export function userProfileToBackend(data: IVorgabenU): Omit<BackendUserProfile, '_id' | 'User'> {
  // VorgabenB: Map {key: value} → Array [{key, value}]
  const vorgabenBArray = Object.entries(data.VorgabenB).map(([key, value]) => ({
    key,
    value: value as Record<string, unknown>,
  }));

  return {
    // OE wird als Ebenen-Array gespeichert, im Formular aber als ein Textfeld gepflegt.
    Pers: { ...data.Pers, OE: splitOeInput(data.Pers?.OE ?? '') },
    Arbeitszeit: data.Arbeitszeit,
    Fahrzeit: data.Fahrzeit,
    VorgabenB: vorgabenBArray,
    Einstellungen: data.Einstellungen,
  };
}

// ─── IVorgabenU ↔ IVorgabenUServer Konvertierung ────────

/**
 * Konvertiert IVorgabenUServer (Array-Format) → IVorgabenU (Map-Format).
 * Wird verwendet, wenn der Server das Array-Format für VorgabenB zurückgibt.
 *
 * @param server - Profil im Server-Format.
 * @returns Profil im Frontend-Format mit normalisierter Arbeitszeit und migriertem `VorgabenB`.
 */
export function vorgabenUFromServer(server: IVorgabenUServer): IVorgabenU {
  const VorgabenB: IVorgabenU['VorgabenB'] = {};
  for (const entry of server.VorgabenB) {
    VorgabenB[entry.key] = migrateVorgabenBEntry(entry.value as Record<string, unknown>);
  }
  return {
    Pers: server.Pers,
    Arbeitszeit: normalizeAZ(server.Arbeitszeit),
    Fahrzeit: server.Fahrzeit,
    VorgabenB,
    Einstellungen: server.Einstellungen,
  };
}

// ─── Hilfsfunktionen ─────────────────────────────────────

export interface FlatMappedDocs<TFrontend> {
  data: TFrontend[];
  maxUpdatedAt: string | null;
}

/**
 * Mappt Backend-Dokumente auf Frontend-Zeilen und ermittelt dabei den neuesten `updatedAt`-Wert.
 *
 * @typeParam TBackend - Backend-Dokumenttyp.
 * @typeParam TFrontend - Frontend-Zeilentyp.
 * @param docs - Backend-Dokumente.
 * @param mapper - Konvertierung eines Dokuments.
 * @returns Gemappte Zeilen und der hoechste `updatedAt` (`null`, wenn keins gesetzt ist).
 */
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
