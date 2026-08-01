import type { IDatenN, INebenZulage, IVorgabenU } from '@/types';
import Storage from '@/infrastructure/storage/Storage';
import {
  ZULAGEN_CATALOG,
  ZulageEntryUnit,
  type ZulageCategory,
  type IZulageCatalogItem,
} from '@/features/Einstellungen/utils/zulagenCatalog';

const zulagenCatalogByCode = new Map<string, IZulageCatalogItem>(ZULAGEN_CATALOG.map(item => [item.code, item]));

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
  if (Array.isArray(item.Zulagen) && item.Zulagen.length > 0) {
    return item.Zulagen
      .filter((zulage): zulage is INebenZulage => Boolean(zulage?.Typ) && Number.isFinite(zulage.Wert))
      .filter(zulage => zulage.Wert > 0);
  }

  // Fallback für alte IndexedDB-Einträge vor Einführung von Zulagen
  const legacy040 = item['anzahl040N'];
  if (typeof legacy040 === 'number' && legacy040 > 0) {
    return [{ Typ: '040', Wert: legacy040 }];
  }

  return [];
}

export function formatNebengeldZulagen(zulagen: INebenZulage[]): string {
  if (zulagen.length === 0) return '-';

  return zulagen
    .map(zulage => {
      const catalogItem = zulagenCatalogByCode.get(zulage.Typ);
      const label = catalogItem ? `${zulage.Typ} ${catalogItem.shortLabel}` : zulage.Typ;
      if (catalogItem?.entryRule.unit === ZulageEntryUnit.Minuten) return `${label} ${zulage.Wert} min`;
      return `${label} × ${zulage.Wert}`;
    })
    .join('\n');
}

export function hydrateNebengeldRow(item: IDatenN): IDatenN {
  const Zulagen = normalizeNebengeldZulagen(item);

  return {
    ...item,
    Zulagen,
    zulagenAnzeigeN: formatNebengeldZulagen(Zulagen),
  };
}

export function hydrateNebengeldRows(rows: IDatenN[]): IDatenN[] {
  return rows.map(hydrateNebengeldRow);
}

export function validateNebengeldZulagen(zulagen: INebenZulage[]): string[] {
  const errors: string[] = [];
  const positiveZulagen = zulagen.filter(zulage => zulage.Wert > 0);
  const positiveByCategory = new Map<ZulageCategory, INebenZulage[]>();

  for (const zulage of positiveZulagen) {
    const catalogItem = zulagenCatalogByCode.get(zulage.Typ);
    if (!catalogItem) continue;

    const existing = positiveByCategory.get(catalogItem.category) ?? [];
    existing.push(zulage);
    positiveByCategory.set(catalogItem.category, existing);

    const { entryRule } = catalogItem;
    if (entryRule.maxEntriesPerDay && zulage.Wert > entryRule.maxEntriesPerDay) {
      errors.push(`${zulage.Typ} darf nur ${entryRule.maxEntriesPerDay}x pro Tag erfasst werden.`);
    }

    if (entryRule.minMinutesPerDay && zulage.Wert > 0 && zulage.Wert < entryRule.minMinutesPerDay) {
      errors.push(`${zulage.Typ} erfordert mindestens ${entryRule.minMinutesPerDay} Minuten pro Tag.`);
    }
  }

  for (const zulage of positiveZulagen) {
    const catalogItem = zulagenCatalogByCode.get(zulage.Typ);
    if (!catalogItem?.entryRule.exclusiveWithinCategoryPerDay) continue;

    const sameCategory = positiveByCategory.get(catalogItem.category) ?? [];
    if (sameCategory.some(item => item.Typ !== zulage.Typ)) {
      errors.push(
        `${zulage.Typ} darf innerhalb der Kategorie an diesem Tag nicht mit anderen Zulagen kombiniert werden.`,
      );
    }
  }

  return errors;
}

export function readNebengeldZulagenFromForm(form: HTMLDivElement | HTMLFormElement): INebenZulage[] {
  const zulagen: INebenZulage[] = [];

  for (const input of Array.from(form.querySelectorAll<HTMLInputElement>('input[data-zulage-input-code]'))) {
    const Typ = input.dataset.zulageInputCode;
    if (!Typ) continue;
    const Wert = Number(input.value || 0);
    if (!Number.isFinite(Wert) || Wert <= 0) continue;
    zulagen.push({ Typ, Wert });
  }

  return zulagen;
}
