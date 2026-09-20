import type { IDatenN } from '@/types';
import { getMonatFromN } from '@/infrastructure/date/getMonatFromItem';
import getNebengeldDaten from '@/features/Neben/utils/getNebengeldDaten';
import { normalizeNebengeldZulagen } from '@/features/Neben/utils/nebengeldZulagen';
import {
  ZULAGEN_CATALOG,
  ZulageEntryUnit,
  type IZulageCatalogItem,
} from '@/features/Einstellungen/utils/zulagenCatalog';

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
}

const zulagenCatalogByCode = new Map<string, IZulageCatalogItem>(ZULAGEN_CATALOG.map(item => [item.code, item]));

/**
 * Kurzform der Einheit einer Zulage für die Anzeige.
 *
 * @param unit - Einheit des Zulagen-Eintrags.
 * @returns "min" für Minuten, sonst "Stk.".
 */
export function zulagenEinheitKurz(unit: ZulageEntryUnit): string {
  return unit === ZulageEntryUnit.Minuten ? 'min' : 'Stk.';
}

/**
 * Aggregiert die Roh-Zulagenwerte aller Nebengeld-Tage des Jahres pro Zulagen-Code und Monat.
 * Unabhängig von der Euro-Berechnung (NFields-Buckets), die die Codes dort bereits zusammengefasst hat.
 *
 * @param rows - Nebengeld-Zeilen; Standard: alle nicht gelöschten des Jahres.
 * @returns Vorkommende Codes (sortiert, mit Label und Einheit) und je Code 12 Monatssummen.
 */
export default function calculateZulagenBreakdown(
  rows: IDatenN[] = getNebengeldDaten(undefined, undefined, { scope: 'all', excludeDeleted: true }),
): IZulagenBreakdown {
  const values: Record<string, number[]> = {};

  for (const row of rows) {
    const monat = getMonatFromN(row);
    if (monat < 1 || monat > 12) continue;

    for (const zulage of normalizeNebengeldZulagen(row)) {
      values[zulage.Typ] ??= Array.from({ length: 12 }, () => 0);
      values[zulage.Typ][monat - 1] += zulage.Wert;
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

  return { codes, values };
}
