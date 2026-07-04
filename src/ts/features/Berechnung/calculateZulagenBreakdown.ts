import type { IDatenN } from '@/types';
import { getMonatFromN } from '@/infrastructure/date/getMonatFromItem';
import getNebengeldDaten from '@/features/Neben/utils/getNebengeldDaten';
import { normalizeNebengeldZulagen } from '@/features/Neben/utils/nebengeldZulagen';
import { ZULAGEN_CATALOG, ZulageEntryUnit } from '@/features/Einstellungen/utils/zulagenCatalog';

export interface IZulagenBreakdownCode {
  code: string;
  label: string;
  unit: ZulageEntryUnit;
}

export interface IZulagenBreakdown {
  /** Im Jahr tatsächlich vorkommende Zulagen-Codes, aufsteigend sortiert */
  codes: IZulagenBreakdownCode[];
  /** Je Code 12 Monats-Rohsummen (Index 0 = Januar; Minuten oder Stück je nach unit) */
  values: Record<string, number[]>;
  /** Aufschlüsselung nur bei mehr als einem vorkommenden Code anzeigen */
  showBreakdown: boolean;
}

const zulagenCatalogByCode = new Map(ZULAGEN_CATALOG.map(item => [item.code, item]));

export function zulagenEinheitKurz(unit: ZulageEntryUnit): string {
  return unit === ZulageEntryUnit.Minuten ? 'min' : 'Stk.';
}

/**
 * Aggregiert die Roh-Zulagenwerte (zulagenN) aller Nebengeld-Tage des Jahres
 * pro Zulagen-Code und Monat. Unabhängig von der Euro-Berechnung (NFields-Buckets),
 * die Code-Informationen dort bereits zusammengefasst hat.
 */
export default function calculateZulagenBreakdown(
  rows: IDatenN[] = getNebengeldDaten(undefined, undefined, { scope: 'all' }),
): IZulagenBreakdown {
  const values: Record<string, number[]> = {};

  for (const row of rows) {
    const monat = getMonatFromN(row);
    if (monat < 1 || monat > 12) continue;

    for (const zulage of normalizeNebengeldZulagen(row)) {
      values[zulage.code] ??= Array.from({ length: 12 }, () => 0);
      values[zulage.code][monat - 1] += zulage.value;
    }
  }

  const codes = Object.keys(values)
    .sort()
    .map(code => {
      const catalogItem = zulagenCatalogByCode.get(code);
      return {
        code,
        label: catalogItem ? `${code} ${catalogItem.shortLabel}` : code,
        unit: catalogItem?.entryRule.unit ?? ZulageEntryUnit.Stueck,
      };
    });

  return { codes, values, showBreakdown: codes.length > 1 };
}
