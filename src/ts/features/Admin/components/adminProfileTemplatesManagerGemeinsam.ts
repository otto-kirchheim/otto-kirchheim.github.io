import { normalizeAZ } from '@/infrastructure/data/fieldMapper';
import { joinOeLevels, splitOeInput } from '@/infrastructure/data/oeLevels';
import { normalizeTimeString } from '@/infrastructure/validation/timeString';
import type { BereitschaftSchichtTyp } from '@/types';
import type { BackendProfileTemplate } from '../utils/api';
import { normalizeVorgabenBRows, type FahrzeitRow, type TemplateContentDraft, type VorgabenBRow } from './profileTemplates.shared';

export type TemplateEditState = {
  code: string;
  name: string;
  description: string;
  active: boolean;
  templateContent: TemplateContentDraft;
};

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function toBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

const SCHICHT_TYPEN: BereitschaftSchichtTyp[] = ['frueh', 'spaet', 'nacht', 'sonder'];

// Liest das neue schichten-Array, fällt für Legacy-Einträge auf nacht zurück; frueh ist immer aktiv.
function normalizeSchichten(value: unknown, legacyNacht: boolean): BereitschaftSchichtTyp[] {
  const fromArray = Array.isArray(value) ? SCHICHT_TYPEN.filter(typ => (value as unknown[]).includes(typ)) : [];
  const schichten = fromArray.length > 0 ? fromArray : legacyNacht ? ['frueh', 'nacht'] : ['frueh'];
  return SCHICHT_TYPEN.filter(typ => typ === 'frueh' || schichten.includes(typ));
}

export function normalizePrimitiveRecord(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object') return {};
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>)
      // OE ist ein Ebenen-Array, wird aber wie die übrigen Pers-Felder als
      // Textfeld gepflegt; ohne diesen Zweig fiele sie durch den Primitiv-Filter
      // und ginge beim Speichern verloren.
      .filter(([key, value]) => key === 'OE' || ['string', 'number', 'boolean'].includes(typeof value))
      .map(([key, value]) => [key, key === 'OE' ? joinOeLevels((value as string[] | undefined) ?? []) : String(value)]),
  );
}

function normalizeFahrzeit(input: unknown): FahrzeitRow[] {
  if (!Array.isArray(input)) return [];
  return input
    .map(entry => ({
      key: String((entry as { key?: unknown }).key ?? ''),
      text: String((entry as { text?: unknown }).text ?? ''),
      // Legacy-Werte wie "0:30" auf "HH:mm" heben – ein type="time"-Input zeigt sie sonst leer an
      value: normalizeTimeString(String((entry as { value?: unknown }).value ?? '')),
    }))
    .filter(row => row.key || row.text || row.value);
}

function normalizeSettings(input: unknown): TemplateContentDraft['Einstellungen'] {
  if (!input || typeof input !== 'object') return { aktivierteTabs: [], benoetigteZulagen: [] };
  const settings = input as { aktivierteTabs?: unknown; benoetigteZulagen?: unknown };
  const aktivierteTabs = Array.isArray(settings.aktivierteTabs)
    ? settings.aktivierteTabs.filter((value): value is string => typeof value === 'string')
    : [];
  const benoetigteZulagen = Array.isArray(settings.benoetigteZulagen)
    ? settings.benoetigteZulagen.filter((value): value is string => typeof value === 'string')
    : [];
  return { aktivierteTabs, benoetigteZulagen };
}

const normalizeTagValue = (n: number): number => (n === 0 ? 7 : Math.min(7, Math.max(1, n)));

function normalizeVorgabenB(input: unknown): VorgabenBRow[] {
  if (!Array.isArray(input)) return [];

  const rows = input
    .map((entry, index) => {
      const row = entry as { key?: unknown; value?: unknown };
      const rawValue = row.value && typeof row.value === 'object' ? ({ ...row.value } as Record<string, unknown>) : {};
      const beginnB = rawValue.beginnB as Record<string, unknown> | undefined;
      const endeB = rawValue.endeB as Record<string, unknown> | undefined;
      const beginnN = rawValue.beginnN as Record<string, unknown> | undefined;
      const endeN = rawValue.endeN as Record<string, unknown> | undefined;
      const schichten = normalizeSchichten(rawValue.schichten, toBoolean(rawValue.nacht));

      return {
        key: toString(row.key, `vorlage-${index + 1}`),
        rawValue,
        value: {
          Name: toString(rawValue.Name),
          beginnB: {
            tag: normalizeTagValue(toNumber(beginnB?.tag, 1)),
            zeit: toString(beginnB?.zeit),
          },
          endeB: {
            tag: normalizeTagValue(toNumber(endeB?.tag, 1)),
            zeit: toString(endeB?.zeit),
            Nwoche: toBoolean(endeB?.Nwoche),
          },
          schichten,
          nacht: schichten.includes('nacht'),
          beginnN: {
            tag: normalizeTagValue(toNumber(beginnN?.tag, 1)),
            zeit: toString(beginnN?.zeit),
            Nwoche: toBoolean(beginnN?.Nwoche),
          },
          endeN: {
            tag: normalizeTagValue(toNumber(endeN?.tag, 1)),
            zeit: toString(endeN?.zeit),
            Nwoche: toBoolean(endeN?.Nwoche),
          },
          standard: toBoolean(rawValue.standard),
        },
      };
    })
    .filter(row => row.key.trim() !== '');

  return normalizeVorgabenBRows(rows);
}

function normalizeArbeitszeit(input: unknown): TemplateContentDraft['Arbeitszeit'] {
  if (!input || typeof input !== 'object') return null;
  return normalizeAZ(input);
}

function sortObjectKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObjectKeysDeep);
  if (!value || typeof value !== 'object') return value;

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entryValue]) => [key, sortObjectKeysDeep(entryValue)] as const);

  return Object.fromEntries(entries);
}

export function normalizeTemplateContent(template: BackendProfileTemplate['template']): TemplateContentDraft {
  return {
    Pers: normalizePrimitiveRecord(template?.Pers),
    Arbeitszeit: normalizeArbeitszeit(template?.Arbeitszeit),
    Fahrzeit: normalizeFahrzeit(template?.Fahrzeit),
    VorgabenB: normalizeVorgabenB(template?.VorgabenB),
    Einstellungen: normalizeSettings(template?.Einstellungen),
  };
}

export function serializeDraft(draft: TemplateContentDraft): string {
  return JSON.stringify({
    Pers: Object.fromEntries(Object.entries(draft.Pers).sort(([a], [b]) => a.localeCompare(b))),
    Arbeitszeit: draft.Arbeitszeit ? sortObjectKeysDeep(draft.Arbeitszeit) : null,
    Fahrzeit: draft.Fahrzeit,
    VorgabenB: draft.VorgabenB,
    Einstellungen: {
      aktivierteTabs: [...draft.Einstellungen.aktivierteTabs].sort(),
      benoetigteZulagen: [...draft.Einstellungen.benoetigteZulagen].sort(),
    },
  });
}

function removeEmptyValues(record: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value.trim() !== ''));
}

export const DEFAULT_ARBEITSZEIT: NonNullable<TemplateContentDraft['Arbeitszeit']> = {
  frueh: { aktiv: true, default: { beginn: '07:00', ende: '15:45', pause: 30 }, regelarbeitstage: [1, 2, 3, 4, 5] },
  spaet: { aktiv: false, default: { beginn: '14:00', ende: '22:00', pause: 30 } },
  nacht: { aktiv: true, default: { beginn: '19:45', ende: '06:15', pause: 45 }, regelarbeitstage: [7, 1, 2, 3] },
  sonder: { aktiv: false, beginn: '06:00', ende: '14:30', pause: 20 },
  fahrzeit: '00:30',
};

export function buildTemplatePayload(
  original: BackendProfileTemplate['template'] | undefined,
  draft: TemplateContentDraft,
): BackendProfileTemplate['template'] {
  const result: Record<string, unknown> = { ...(original ?? {}) };

  const pers = removeEmptyValues(draft.Pers);
  // Beschreibung (text) ist optional; nur Tätigkeitsstätte und Fahrzeit sind Pflicht
  const fahrzeit = draft.Fahrzeit.filter(row => row.key.trim() && row.value.trim());
  const vorgabenB = draft.VorgabenB.filter(row => row.key.trim() !== '').map(row => ({
    key: row.key.trim(),
    value: {
      ...row.rawValue,
      Name: row.value.Name,
      beginnB: row.value.beginnB,
      endeB: row.value.endeB,
      schichten: row.value.schichten,
      nacht: row.value.schichten.includes('nacht'),
      beginnN: row.value.beginnN,
      endeN: row.value.endeN,
      ...(row.value.standard ? { standard: true } : { standard: undefined }),
    },
  }));
  const settings = {
    aktivierteTabs: draft.Einstellungen.aktivierteTabs,
    benoetigteZulagen: draft.Einstellungen.benoetigteZulagen,
  };

  if (Object.keys(pers).length > 0) {
    // OE geht als Ebenen-Array zurück ans Backend, im Formular ist sie ein Textfeld.
    result.Pers = pers.OE === undefined ? pers : { ...pers, OE: splitOeInput(pers.OE) };
  } else delete result.Pers;

  if (draft.Arbeitszeit) result.Arbeitszeit = draft.Arbeitszeit;
  else delete result.Arbeitszeit;

  if (fahrzeit.length > 0) result.Fahrzeit = fahrzeit;
  else delete result.Fahrzeit;

  if (vorgabenB.length > 0) result.VorgabenB = vorgabenB;
  else delete result.VorgabenB;

  if (settings.aktivierteTabs.length > 0 || settings.benoetigteZulagen.length > 0) result.Einstellungen = settings;
  else delete result.Einstellungen;

  return result as BackendProfileTemplate['template'];
}

export function toEditState(template: BackendProfileTemplate): TemplateEditState {
  return {
    code: template.code,
    name: template.name,
    description: template.description ?? '',
    active: template.active,
    templateContent: normalizeTemplateContent(template.template),
  };
}
