import dayjs from '@/infrastructure/date/configDayjs';

export const IMMUTABLE_FIELDS = new Set(['_id', '__v', 'createdAt']);
export const READONLY_FIELDS = new Set(['updatedAt']);
export const ITEMS_PER_PAGE = 25;

// Felder mit festen Enum-Werten → Dropdown
export const FIELD_ENUMS: Record<string, string[]> = {
  LRE: ['LRE 1', 'LRE 2', 'LRE 1/2 ohne x', 'LRE 3', 'LRE 3 ohne x'],
  Schicht: ['T', 'SP', 'N', 'S', 'BN'],
};

// Cross-Resource-Referenzen: Feldname → Ziel-Ressource
export type CrossRef = { resourceIdx: number; isArray?: boolean };
export const CROSS_REFS: Record<string, CrossRef> = {
  EWT: { resourceIdx: 2 },
  Bereitschaftszeitraum: { resourceIdx: 1, isArray: true },
};
// Hinweis: EA referenziert EWT ebenfalls über das Feld `EWT` (resourceIdx: 2) — CROSS_REFS ist
// pro Feldname, nicht pro Ressource, daher kein separater Eintrag nötig (siehe RESOURCES unten).

// Schema-Felder je Ressource (für Darstellung optionaler null-Felder)
export const SCHEMA_FIELDS: Record<string, string[]> = {
  bereitschaftseinsaetze: [
    'User',
    'Bereitschaftszeitraum',
    'Jahr',
    'Monat',
    'Tag',
    'Auftragsnummer',
    'Beginn',
    'Ende',
    'LRE',
    'PrivatKm',
  ],
  bereitschaftszeitraeume: ['User', 'Jahr', 'Monat', 'Beginn', 'Ende', 'Pause'],
  einsatzwechseltaetigkeiten: [
    'User',
    'Jahr',
    'Monat',
    'Tag',
    'Buchungstag',
    'Einsatzort',
    'Schicht',
    'abWE',
    'ab1E',
    'anEE',
    'beginE',
    'endeE',
    'abEE',
    'an1E',
    'anWE',
    'berechnen',
  ],
  nebengeld: ['User', 'EWT', 'Jahr', 'Monat', 'Tag', 'Beginn', 'Ende', 'Auftragsnummer', 'Zulagen'],
  entgeltausgleich: ['User', 'EWT', 'Jahr', 'Monat', 'Tag', 'Dauer', 'Taetigkeit', 'Entgeltgruppe'],
};

// Datumsfelder die NUR als Datum gespeichert sind (kein Zeitanteil relevant)
export const DATE_ONLY_FIELDS = new Set(['Tag', 'Buchungstag']);

// Zeitfelder die als "HH:mm"-String gespeichert sind (kein ISO-Datum, kein looksLikeIso-Match)
// BZ.Beginn/Ende sind Date-Typ und greifen über looksLikeIso; diese hier sind String-Typ
export const TIME_STRING_FIELDS = new Set([
  'Beginn',
  'Ende', // BE + NG
  'abWE',
  'ab1E',
  'anEE',
  'beginE',
  'endeE',
  'abEE',
  'an1E',
  'anWE', // EWT
  'Dauer', // EA
]);

export type ResourceConfig = {
  label: string;
  shortLabel: string;
  endpoint: string;
  tableFields: string[];
  extraFields?: string[];
};

export const RESOURCES: ResourceConfig[] = [
  {
    label: 'Bereitschaftseinsatz',
    shortLabel: 'BE',
    endpoint: 'bereitschaftseinsaetze',
    tableFields: ['User', 'Jahr', 'Monat', 'LRE', 'Auftragsnummer'],
    extraFields: ['Tag', 'createdAt'],
  },
  {
    label: 'Bereitschaftszeitraum',
    shortLabel: 'BZ',
    endpoint: 'bereitschaftszeitraeume',
    tableFields: ['User', 'Jahr', 'Monat', 'Beginn', 'Ende'],
    extraFields: ['createdAt'],
  },
  {
    label: 'Einsatzwechseltätigkeit',
    shortLabel: 'EWT',
    endpoint: 'einsatzwechseltaetigkeiten',
    tableFields: ['User', 'Jahr', 'Monat', 'Schicht', 'Tag'],
    extraFields: ['createdAt'],
  },
  {
    label: 'Nebengeld',
    shortLabel: 'NG',
    endpoint: 'nebengeld',
    tableFields: ['User', 'Jahr', 'Monat', 'Tag'],
    extraFields: ['EWT', 'createdAt'],
  },
  {
    label: 'Entgeltausgleich',
    shortLabel: 'EA',
    endpoint: 'entgeltausgleich',
    tableFields: ['User', 'Jahr', 'Monat', 'Tag', 'Dauer'],
    extraFields: ['EWT', 'Taetigkeit', 'Entgeltgruppe', 'createdAt'],
  },
];

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

export function isObjectId(val: unknown): val is string {
  return typeof val === 'string' && /^[0-9a-f]{24}$/i.test(val);
}

export function truncateId(val: unknown): string {
  const s = String(val ?? '');
  return s.length > 10 ? `…${s.slice(-8)}` : s;
}

export function looksLikeIso(val: unknown): boolean {
  return typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val);
}

// Datumsfelder die nur Datum (kein Zeit) enthalten: UTC nutzen (kein Timezone-Versatz)
export function formatDateOnly(isoStr: string): string {
  const d = dayjs.utc(isoStr);
  return d.isValid() ? d.format('DD.MM.YYYY') : isoStr;
}

// Datetime-Felder: lokale Zeitzone anzeigen
export function formatDateTime(isoStr: string): string {
  const d = dayjs(isoStr);
  return d.isValid() ? d.format('DD.MM.YY, HH:mm') : isoStr;
}

// ISO → "YYYY-MM-DD" (UTC-Datum für type="date" input)
export function toDateInput(isoStr: string): string {
  const d = dayjs.utc(isoStr);
  return d.isValid() ? d.format('YYYY-MM-DD') : '';
}

// ISO → "YYYY-MM-DDTHH:mm" (lokale Zeit für type="datetime-local" input)
export function toDatetimeLocal(isoStr: string): string {
  const d = dayjs(isoStr);
  return d.isValid() ? d.format('YYYY-MM-DDTHH:mm') : '';
}

export function formatCell(fieldName: string, val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (Array.isArray(val)) return `[${(val as unknown[]).length}]`;
  if (typeof val === 'object') return '{…}';
  if (looksLikeIso(val)) {
    return DATE_ONLY_FIELDS.has(fieldName) ? formatDateOnly(String(val)) : formatDateTime(String(val));
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

export function buildEditState(doc: Record<string, unknown>, endpoint: string): EditState {
  const schemaFields = SCHEMA_FIELDS[endpoint] ?? [];
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
    if (val !== null && typeof val === 'object' && !CROSS_REFS[key]) {
      rawStrings[key] = JSON.stringify(val, null, 2);
    }
  }
  return { doc, values, rawStrings, jsonErrors: {}, saving: false, saveError: null };
}
