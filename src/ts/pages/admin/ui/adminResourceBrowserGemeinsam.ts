import dayjs from '@/shared/lib/date/configDayjs';
import { adminCrossRef, adminSchemaFields, type AdminResourceConfig } from '../adminFeatures';

export const IMMUTABLE_FIELDS = new Set(['_id', '__v', 'createdAt']);
export const READONLY_FIELDS = new Set(['updatedAt']);
export const ITEMS_PER_PAGE = 25;

export const MONATE = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

/**
 * Prüft, ob `val` eine 24-stellige Hex-Zeichenkette (MongoDB-ObjectId) ist.
 *
 * @param val - Beliebiger Wert.
 * @returns `true` bei ObjectId-Format.
 */
export function isObjectId(val: unknown): val is string {
  return typeof val === 'string' && /^[0-9a-f]{24}$/i.test(val);
}

/**
 * Kürzt lange Ids für die Anzeige auf `…` plus die letzten 8 Zeichen.
 *
 * @param val - Id oder beliebiger Wert.
 * @returns Gekürzter oder unveränderter Text.
 */
export function truncateId(val: unknown): string {
  const s = String(val ?? '');
  return s.length > 10 ? `…${s.slice(-8)}` : s;
}

/**
 * Prüft, ob `val` mit einem ISO-Zeitstempel (`YYYY-MM-DDTHH:mm`) beginnt.
 *
 * @param val - Beliebiger Wert.
 * @returns `true` bei ISO-Format.
 */
export function looksLikeIso(val: unknown): boolean {
  return typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val);
}

/**
 * Formatiert ein reines Datumsfeld in UTC, damit die Zeitzone das Datum nicht verschiebt.
 *
 * @param isoStr - ISO-Zeitstempel.
 * @returns `DD.MM.YYYY`, bei ungültigem Datum der Eingabetext.
 */
export function formatDateOnly(isoStr: string): string {
  const d = dayjs.utc(isoStr);
  return d.isValid() ? d.format('DD.MM.YYYY') : isoStr;
}

/**
 * Formatiert ein Datetime-Feld in lokaler Zeitzone.
 *
 * @param isoStr - ISO-Zeitstempel.
 * @returns `DD.MM.YY, HH:mm`, bei ungültigem Datum der Eingabetext.
 */
export function formatDateTime(isoStr: string): string {
  const d = dayjs(isoStr);
  return d.isValid() ? d.format('DD.MM.YY, HH:mm') : isoStr;
}

/**
 * Wandelt ISO in den Wert eines `type="date"`-Inputs (UTC-Datum).
 *
 * @param isoStr - ISO-Zeitstempel.
 * @returns `YYYY-MM-DD`, bei ungültigem Datum `''`.
 */
export function toDateInput(isoStr: string): string {
  const d = dayjs.utc(isoStr);
  return d.isValid() ? d.format('YYYY-MM-DD') : '';
}

/**
 * Wandelt ISO in den Wert eines `type="datetime-local"`-Inputs (lokale Zeit).
 *
 * @param isoStr - ISO-Zeitstempel.
 * @returns `YYYY-MM-DDTHH:mm`, bei ungültigem Datum `''`.
 */
export function toDatetimeLocal(isoStr: string): string {
  const d = dayjs(isoStr);
  return d.isValid() ? d.format('YYYY-MM-DDTHH:mm') : '';
}

/**
 * Prueft, ob ein Feld der Ressource nur ein Datum traegt (`nurDatumFelder` des Admin-Anteils).
 *
 * @param resource - Ressourcen-Konfiguration.
 * @param fieldName - Feldname.
 * @returns `true` bei reinem Datumsfeld.
 */
export function istNurDatumFeld(resource: AdminResourceConfig, fieldName: string): boolean {
  return resource.nurDatumFelder?.includes(fieldName) ?? false;
}

/**
 * Prueft, ob ein Feld der Ressource eine `HH:mm`-Zeit als String traegt (`zeitFelder` des Admin-Anteils).
 *
 * @param resource - Ressourcen-Konfiguration.
 * @param fieldName - Feldname.
 * @returns `true` bei Zeitfeld.
 */
export function istZeitFeld(resource: AdminResourceConfig, fieldName: string): boolean {
  return resource.zeitFelder?.includes(fieldName) ?? false;
}

/**
 * Formatiert einen Feldwert für die Tabellenzelle: Datum je nach Feldtyp, Arrays/Objekte als Kurzform, Text auf 24 Zeichen gekürzt.
 *
 * @param resource - Ressourcen-Konfiguration; ihre `nurDatumFelder` werden ohne Uhrzeit angezeigt.
 * @param fieldName - Feldname.
 * @param val - Feldwert.
 * @returns Anzeigetext; `'—'` bei `null`/`undefined`.
 */
export function formatCell(resource: AdminResourceConfig, fieldName: string, val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (Array.isArray(val)) return `[${(val as unknown[]).length}]`;
  if (typeof val === 'object') return '{…}';
  if (looksLikeIso(val)) {
    return istNurDatumFeld(resource, fieldName) ? formatDateOnly(String(val)) : formatDateTime(String(val));
  }
  const s = String(val);
  return s.length > 24 ? `${s.slice(0, 22)}…` : s;
}

export type FilterParams = { userId?: string; jahr?: number; monat?: number };

export type EditState = {
  doc: Record<string, unknown>;
  values: Record<string, unknown>;
  rawStrings: Record<string, string>;
  jsonErrors: Record<string, string>;
  saving: boolean;
  saveError: string | null;
};

/**
 * Erstellt den Bearbeitungszustand eines Dokuments; Feldreihenfolge: Schema-Felder (fehlende als `null`), System-Felder, übrige. Objektwerte außer Cross-Refs erhalten einen JSON-Rohtext.
 *
 * @param doc - Originaldokument.
 * @param endpoint - Ressourcen-Endpunkt, bestimmt die Schema-Felder (aus den Admin-Anteilen der Features).
 * @returns Ausgangszustand des Editors.
 */
export function buildEditState(doc: Record<string, unknown>, endpoint: string): EditState {
  const schemaFields = adminSchemaFields(endpoint);
  const systemFields = ['_id', '__v', 'createdAt', 'updatedAt'];

  // Felder in Reihenfolge: Schema-Felder (mit null für fehlende) → System-Felder → Rest
  const values: Record<string, unknown> = {};
  for (const f of schemaFields) {
    values[f] = f in doc ? doc[f] : null;
  }
  for (const f of systemFields) {
    if (f in doc) values[f] = doc[f];
  }
  for (const [k, v] of Object.entries(doc)) {
    if (!(k in values)) values[k] = v;
  }

  const rawStrings: Record<string, string> = {};
  for (const [key, val] of Object.entries(values)) {
    if (val !== null && typeof val === 'object' && !adminCrossRef(key)) {
      rawStrings[key] = JSON.stringify(val, null, 2);
    }
  }
  return { doc, values, rawStrings, jsonErrors: {}, saving: false, saveError: null };
}
