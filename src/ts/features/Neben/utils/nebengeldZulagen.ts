import type { IDatenN, INebenZulage, IVorgabenU } from '@/types';
import Storage from '@/infrastructure/storage/Storage';
import {
  ZULAGEN_CATALOG,
  ZulageEntryUnit,
  type ZulageCategory,
  type IZulageCatalogItem,
} from '@/features/Einstellungen/utils/zulagenCatalog';

const zulagenCatalogByCode = new Map(ZULAGEN_CATALOG.map(item => [item.code, item]));

function getSelectedZulagenCodes(): string[] {
  try {
    return Storage.get<IVorgabenU>('VorgabenU', { check: true })?.Einstellungen?.benoetigteZulagen ?? [];
  } catch {
    return [];
  }
}

export function getConfiguredNebenZulagen(existingCodes: string[] = []): IZulageCatalogItem[] {
  const selectedCodes = getSelectedZulagenCodes();
  const codes = new Set([...selectedCodes, ...existingCodes]);
  return ZULAGEN_CATALOG.filter(item => codes.has(item.code));
}

export function normalizeNebengeldZulagen(item: Partial<IDatenN>): INebenZulage[] {
  if (Array.isArray(item.zulagenN) && item.zulagenN.length > 0) {
    return item.zulagenN
      .filter((zulage): zulage is INebenZulage => Boolean(zulage?.code) && Number.isFinite(zulage.value))
      .filter(zulage => zulage.value > 0);
  }

  // Fallback für alte IndexedDB-Einträge vor Einführung von zulagenN
  const legacy040 = item['anzahl040N'];
  if (typeof legacy040 === 'number' && legacy040 > 0) {
    return [{ code: '040', value: legacy040 }];
  }

  return [];
}

export function formatNebengeldZulagen(zulagen: INebenZulage[]): string {
  if (zulagen.length === 0) return '-';

  return zulagen
    .map(zulage => {
      const catalogItem = zulagenCatalogByCode.get(zulage.code);
      const label = catalogItem ? `${zulage.code} ${catalogItem.shortLabel}` : zulage.code;
      if (catalogItem?.entryRule.unit === ZulageEntryUnit.Minuten) return `${label} ${zulage.value} min`;
      return `${label} × ${zulage.value}`;
    })
    .join('\n');
}

export function hydrateNebengeldRow(item: IDatenN): IDatenN {
  const zulagenN = normalizeNebengeldZulagen(item);

  return {
    ...item,
    zulagenN,
    zulagenAnzeigeN: formatNebengeldZulagen(zulagenN),
  };
}

export function hydrateNebengeldRows(rows: IDatenN[]): IDatenN[] {
  return rows.map(hydrateNebengeldRow);
}

export function validateNebengeldZulagen(zulagen: INebenZulage[]): string[] {
  const errors: string[] = [];
  const positiveZulagen = zulagen.filter(zulage => zulage.value > 0);
  const positiveByCategory = new Map<ZulageCategory, INebenZulage[]>();

  for (const zulage of positiveZulagen) {
    const catalogItem = zulagenCatalogByCode.get(zulage.code);
    if (!catalogItem) continue;

    const existing = positiveByCategory.get(catalogItem.category) ?? [];
    existing.push(zulage);
    positiveByCategory.set(catalogItem.category, existing);

    const { entryRule } = catalogItem;
    if (entryRule.maxEntriesPerDay && zulage.value > entryRule.maxEntriesPerDay) {
      errors.push(`${zulage.code} darf nur ${entryRule.maxEntriesPerDay}x pro Tag erfasst werden.`);
    }

    if (entryRule.minMinutesPerDay && zulage.value > 0 && zulage.value < entryRule.minMinutesPerDay) {
      errors.push(`${zulage.code} erfordert mindestens ${entryRule.minMinutesPerDay} Minuten pro Tag.`);
    }
  }

  for (const zulage of positiveZulagen) {
    const catalogItem = zulagenCatalogByCode.get(zulage.code);
    if (!catalogItem?.entryRule.exclusiveWithinCategoryPerDay) continue;

    const sameCategory = positiveByCategory.get(catalogItem.category) ?? [];
    if (sameCategory.some(item => item.code !== zulage.code)) {
      errors.push(
        `${zulage.code} darf innerhalb der Kategorie an diesem Tag nicht mit anderen Zulagen kombiniert werden.`,
      );
    }
  }

  return errors;
}

export function readNebengeldZulagenFromForm(form: HTMLDivElement | HTMLFormElement): INebenZulage[] {
  const zulagen: INebenZulage[] = [];

  for (const input of Array.from(form.querySelectorAll<HTMLInputElement>('input[data-zulage-input-code]'))) {
    const code = input.dataset.zulageInputCode;
    if (!code) continue;
    const value = Number(input.value || 0);
    if (!Number.isFinite(value) || value <= 0) continue;
    zulagen.push({ code, value });
  }

  return zulagen;
}
