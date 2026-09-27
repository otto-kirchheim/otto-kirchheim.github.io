import type { BereitschaftSchichtTyp } from '@/types';

/** Daten des Vorlagen-Abschnitts „VorgabenB“ (Bereitschaftszeitraum-Vorgaben): Entwurfstyp, Normalisierung, Speicher-Format. */

export type VorgabenBRow = {
  key: string;
  rawValue: Record<string, unknown>;
  value: {
    Name: string;
    beginnB: { tag: number; zeit: string };
    endeB: { tag: number; zeit: string; Nwoche: boolean };
    schichten: BereitschaftSchichtTyp[];
    nacht: boolean;
    beginnN: { tag: number; zeit: string; Nwoche: boolean };
    endeN: { tag: number; zeit: string; Nwoche: boolean };
    standard: boolean;
  };
};

/**
 * Wandelt einen Wert in eine endliche Zahl um.
 *
 * @param value - Beliebiger Eingabewert.
 * @param fallback - Ersatz, wenn das Ergebnis keine endliche Zahl ist.
 * @returns Zahl oder `fallback`.
 */
function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Liefert `value` nur, wenn es ein String ist.
 *
 * @param value - Beliebiger Eingabewert.
 * @param fallback - Ersatz für Nicht-Strings.
 * @returns String oder `fallback`.
 */
function toString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/**
 * Liefert `value` nur, wenn es ein Boolean ist.
 *
 * @param value - Beliebiger Eingabewert.
 * @param fallback - Ersatz für Nicht-Booleans.
 * @returns Boolean oder `fallback`.
 */
function toBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

const SCHICHT_TYPEN: BereitschaftSchichtTyp[] = ['frueh', 'spaet', 'nacht', 'sonder'];

/**
 * Liest das `schichten`-Array; fehlt es, gilt bei Legacy-Einträgen `nacht` als Schalter. `frueh` ist immer aktiv.
 *
 * @param value - Rohwert von `schichten`.
 * @param legacyNacht - Altes `nacht`-Flag, gilt nur ohne gültiges Array.
 * @returns Schichttypen in fester Reihenfolge (`SCHICHT_TYPEN`).
 */
function normalizeSchichten(value: unknown, legacyNacht: boolean): BereitschaftSchichtTyp[] {
  const fromArray = Array.isArray(value) ? SCHICHT_TYPEN.filter(typ => (value as unknown[]).includes(typ)) : [];
  const schichten = fromArray.length > 0 ? fromArray : legacyNacht ? ['frueh', 'nacht'] : ['frueh'];
  return SCHICHT_TYPEN.filter(typ => typ === 'frueh' || schichten.includes(typ));
}

/**
 * Begrenzt einen Wochentag auf 1 (Mo) bis 7 (So); die Altkodierung 0 (Sonntag) wird zu 7.
 *
 * @param n - Wochentag.
 * @returns Wochentag 1-7.
 */
const normalizeTagValue = (n: number): number => (n === 0 ? 7 : Math.min(7, Math.max(1, n)));

/**
 * Normalisiert die Bereitschafts-Vorgaben: Tage/Zeiten/Schichten werden bereinigt, Zeilen ohne Schlüssel verworfen, danach erhält genau eine Zeile `standard`.
 *
 * @param input - Rohwert von `VorgabenB`.
 * @returns Normalisierte Zeilen; leer bei Nicht-Arrays.
 */
export function normalizeVorgabenB(input: unknown): VorgabenBRow[] {
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

/**
 * Vergibt fortlaufende Schlüssel (`'1'`, `'2'`, …) und markiert genau eine Zeile als Standard.
 *
 * @param rows - Bereitschafts-Vorgaben.
 * @param preferredStandardIndex - Gewünschter Standard-Index; ungültig oder fehlend gilt die bisherige Standardzeile, sonst die erste.
 * @returns Neue Zeilen; leeres Array bei leerer Eingabe.
 */
export function normalizeVorgabenBRows(rows: VorgabenBRow[], preferredStandardIndex?: number): VorgabenBRow[] {
  if (rows.length === 0) return [];

  let standardIndex = preferredStandardIndex ?? rows.findIndex(row => row.value.standard);
  if (standardIndex < 0 || standardIndex >= rows.length) standardIndex = 0;

  return rows.map((row, index) => ({
    ...row,
    key: String(index + 1),
    value: {
      ...row.value,
      standard: index === standardIndex,
    },
  }));
}

/**
 * Schreibt die Vorgaben ins Speicher-Format: Zeilen ohne Schluessel entfallen, unbekannte Felder (`rawValue`) bleiben.
 *
 * @param rows - Entwurf.
 * @returns `VorgabenB` fuers Backend; leer, wenn keine Zeile bleibt.
 */
export function vorgabenBInVorlage(rows: VorgabenBRow[]): { key: string; value: Record<string, unknown> }[] {
  return rows
    .filter(row => row.key.trim() !== '')
    .map(row => ({
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
}
