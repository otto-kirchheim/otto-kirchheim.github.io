import { normalizeAZ } from '@/shared/lib/ressource/fieldMapper';
import { joinOeLevels, splitOeInput } from '@/shared/lib/ressource/oeLevels';
import type { BackendProfileTemplate } from '../api/api';
import type { AdminVorlagenAbschnitt } from '../adminFeatures';
import type { TemplateContentDraft } from './profileTemplates.shared';

export type TemplateEditState = {
  code: string;
  name: string;
  description: string;
  active: boolean;
  templateContent: TemplateContentDraft;
};

/**
 * Reduziert ein Objekt auf String-Werte (Zahlen/Booleans werden gestringt, alles andere verworfen); `OE` wird von Ebenen-Array zu Text zusammengesetzt.
 *
 * @param input - Rohobjekt, z.B. `template.Pers`.
 * @returns Record aus Strings; leer bei Nicht-Objekten.
 */
export function normalizePrimitiveRecord(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object') return {};
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>)
      // OE ist ein Ebenen-Array, wird aber als Textfeld gepflegt; ohne diesen Zweig fiele sie
      // durch den Primitiv-Filter und ginge beim Speichern verloren.
      .filter(([key, value]) => key === 'OE' || ['string', 'number', 'boolean'].includes(typeof value))
      .map(([key, value]) => [key, key === 'OE' ? joinOeLevels((value as string[] | undefined) ?? []) : String(value)]),
  );
}

/**
 * Liest die sichtbaren Bereiche aus den Einstellungen.
 *
 * @param input - Rohwert von `Einstellungen`.
 * @returns `aktivierteTabs` (nur Strings).
 */
function normalizeSettings(input: unknown): TemplateContentDraft['Einstellungen'] {
  const liste = (input as { aktivierteTabs?: unknown } | null | undefined)?.aktivierteTabs;
  return {
    aktivierteTabs: Array.isArray(liste) ? liste.filter((value): value is string => typeof value === 'string') : [],
  };
}

/**
 * Normalisiert die Arbeitszeit-Vorgaben über `normalizeAZ`.
 *
 * @param input - Rohwert von `Arbeitszeit`.
 * @returns Arbeitszeit-Objekt oder `null` bei Nicht-Objekten.
 */
function normalizeArbeitszeit(input: unknown): TemplateContentDraft['Arbeitszeit'] {
  if (!input || typeof input !== 'object') return null;
  return normalizeAZ(input);
}

/**
 * Sortiert die Schlüssel verschachtelter Objekte rekursiv, damit gleiche Inhalte gleich serialisiert werden.
 *
 * @param value - Beliebiger Wert; Arrays werden elementweise behandelt.
 * @returns Kopie mit alphabetisch sortierten Objektschlüsseln.
 */
function sortObjectKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObjectKeysDeep);
  if (!value || typeof value !== 'object') return value;

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entryValue]) => [key, sortObjectKeysDeep(entryValue)] as const);

  return Object.fromEntries(entries);
}

/**
 * Überführt den Rohinhalt eines Templates in den editierbaren Entwurf.
 *
 * @param template - Template-Inhalt aus dem Backend (kann fehlen).
 * @param abschnitte - Vorlagen-Abschnitte der geladenen Admin-Anteile (`vorlagenAbschnitte`).
 * @returns Normalisierter Entwurf; je Abschnitt ein Eintrag in `abschnitte`.
 */
export function normalizeTemplateContent(
  template: BackendProfileTemplate['template'],
  abschnitte: readonly AdminVorlagenAbschnitt<unknown>[] = [],
): TemplateContentDraft {
  const roh = (template ?? {}) as Record<string, unknown>;
  return {
    Pers: normalizePrimitiveRecord(template?.Pers),
    Arbeitszeit: normalizeArbeitszeit(template?.Arbeitszeit),
    Einstellungen: normalizeSettings(template?.Einstellungen),
    abschnitte: Object.fromEntries(abschnitte.map(abschnitt => [abschnitt.id, abschnitt.ausVorlage(roh)])),
  };
}

/**
 * Serialisiert einen Entwurf mit sortierten Schlüsseln und Listen, um Änderungen unabhängig von der Reihenfolge zu erkennen.
 *
 * @param draft - Aktueller Entwurf.
 * @returns JSON-Text.
 */
export function serializeDraft(draft: TemplateContentDraft): string {
  return JSON.stringify({
    Pers: Object.fromEntries(Object.entries(draft.Pers).sort(([a], [b]) => a.localeCompare(b))),
    Arbeitszeit: draft.Arbeitszeit ? sortObjectKeysDeep(draft.Arbeitszeit) : null,
    Einstellungen: { aktivierteTabs: [...draft.Einstellungen.aktivierteTabs].sort() },
    abschnitte: sortObjectKeysDeep(draft.abschnitte),
  });
}

/**
 * Entfernt Einträge, deren Wert nur aus Leerraum besteht.
 *
 * @param record - Schlüssel-Wert-Paare aus Textfeldern.
 * @returns Gefilterte Kopie.
 */
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

/**
 * Baut aus dem Entwurf den Template-Inhalt fürs Backend: leere Abschnitte werden weggelassen, unbekannte Felder des
 * Originals bleiben erhalten -- auch die Abschnitte von Features, die gerade nicht angemeldet sind.
 *
 * @param original - Bisheriger Template-Inhalt, falls vorhanden.
 * @param draft - Bearbeiteter Entwurf.
 * @param abschnitte - Vorlagen-Abschnitte der geladenen Admin-Anteile; nur Abschnitte mit Entwurf schreiben.
 * @returns Template-Inhalt zum Speichern.
 */
export function buildTemplatePayload(
  original: BackendProfileTemplate['template'] | undefined,
  draft: TemplateContentDraft,
  abschnitte: readonly AdminVorlagenAbschnitt<unknown>[] = [],
): BackendProfileTemplate['template'] {
  const result: Record<string, unknown> = { ...(original ?? {}) };

  const pers = removeEmptyValues(draft.Pers);
  if (Object.keys(pers).length > 0) {
    // OE geht als Ebenen-Array zurück ans Backend, im Formular ist sie ein Textfeld.
    result.Pers = pers.OE === undefined ? pers : { ...pers, OE: splitOeInput(pers.OE) };
  } else delete result.Pers;

  if (draft.Arbeitszeit) result.Arbeitszeit = draft.Arbeitszeit;
  else delete result.Arbeitszeit;

  const bisherigeEinstellungen =
    original?.Einstellungen && typeof original.Einstellungen === 'object' ? original.Einstellungen : {};
  result.Einstellungen = { ...bisherigeEinstellungen, aktivierteTabs: draft.Einstellungen.aktivierteTabs };

  for (const abschnitt of abschnitte)
    if (abschnitt.id in draft.abschnitte) abschnitt.inVorlage(result, draft.abschnitte[abschnitt.id]);

  // Einstellungen teilen sich globale Bereiche und Feature-Abschnitte (z. B. Zulagen): nur leere Listen -> weglassen.
  const einstellungen = result.Einstellungen as Record<string, unknown>;
  if (Object.values(einstellungen).every(wert => wert === undefined || (Array.isArray(wert) && wert.length === 0)))
    delete result.Einstellungen;

  return result as BackendProfileTemplate['template'];
}

/**
 * Erstellt aus einem Backend-Template den Bearbeitungszustand.
 *
 * @param template - Template aus dem Backend.
 * @param abschnitte - Vorlagen-Abschnitte der geladenen Admin-Anteile.
 * @returns Bearbeitungszustand mit normalisiertem Inhalt.
 */
export function toEditState(
  template: BackendProfileTemplate,
  abschnitte: readonly AdminVorlagenAbschnitt<unknown>[] = [],
): TemplateEditState {
  return {
    code: template.code,
    name: template.name,
    description: template.description ?? '',
    active: template.active,
    templateContent: normalizeTemplateContent(template.template, abschnitte),
  };
}
