import type { IDatenN, INebenZulage, IVorgabenU } from '@/types';
import Storage from '@/shared/lib/storage/Storage';
import {
  ZULAGEN_CATALOG,
  ZulageEntryUnit,
  type ZulageCategory,
  type IZulageCatalogItem,
} from '@/features/Einstellungen/utils/zulagenCatalog';

const zulagenCatalogByCode = new Map<string, IZulageCatalogItem>(ZULAGEN_CATALOG.map(item => [item.code, item]));

/**
 * Liest die in den Einstellungen als benötigt markierten Zulagen-Codes.
 *
 * @returns Codes aus den Einstellungen; leer, wenn keine Vorgaben vorliegen.
 */
function getSelectedZulagenCodes(): string[] {
  try {
    return Storage.get<IVorgabenU>('VorgabenU', { check: true })?.Einstellungen?.benoetigteZulagen ?? [];
  } catch {
    return [];
  }
}

/**
 * Ermittelt die Zulagen, die im Neben-Formular angeboten werden.
 *
 * @param existingCodes - Codes, die zusätzlich enthalten sein müssen (z.B. bereits erfasste, aber inzwischen abgewählte Zulagen).
 * @returns Katalogeinträge der gewählten und zusätzlichen Codes in Katalogreihenfolge.
 */
export function getConfiguredNebenZulagen(existingCodes: string[] = []): IZulageCatalogItem[] {
  const selectedCodes = getSelectedZulagenCodes();
  const codes = new Set([...selectedCodes, ...existingCodes]);
  return ZULAGEN_CATALOG.filter(item => codes.has(item.code));
}

/**
 * Liefert die Zulagen eines Datensatzes bereinigt; ältere Datensätze mit `anzahl040N` werden zur Zulage "040" umgewandelt.
 *
 * @param item - Nebengeld-Datensatz.
 * @returns Nur Zulagen mit Typ und positivem Wert; leer, wenn keine vorhanden.
 */
export function normalizeNebengeldZulagen(item: Partial<IDatenN>): INebenZulage[] {
  if (Array.isArray(item.Zulagen) && item.Zulagen.length > 0) {
    return item.Zulagen.filter(
      (zulage): zulage is INebenZulage => Boolean(zulage?.Typ) && Number.isFinite(zulage.Wert),
    ).filter(zulage => zulage.Wert > 0);
  }

  // Fallback für Datensätze aus der Zeit vor den Zulagen (Feld `anzahl040N`).
  const legacy040 = item['anzahl040N'];
  if (typeof legacy040 === 'number' && legacy040 > 0) {
    return [{ Typ: '040', Wert: legacy040 }];
  }

  return [];
}

/**
 * Formatiert Zulagen für die Anzeige, z.B. "040 Kurzlabel × 2" oder "… 30 min".
 *
 * @param zulagen - Zulagen des Datensatzes.
 * @returns Eine Zeile je Zulage (Minuten- oder Anzahl-Angabe), durch Zeilenumbruch getrennt; "-" ohne Zulagen.
 */
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

/**
 * Ergänzt einen Datensatz um bereinigte Zulagen und deren Anzeigetext.
 *
 * @param item - Nebengeld-Datensatz.
 * @returns Kopie mit bereinigten `Zulagen` und aktualisiertem `zulagenAnzeigeN`.
 */
export function hydrateNebengeldRow(item: IDatenN): IDatenN {
  const Zulagen = normalizeNebengeldZulagen(item);

  return {
    ...item,
    Zulagen,
    zulagenAnzeigeN: formatNebengeldZulagen(Zulagen),
  };
}

/**
 * Wendet `hydrateNebengeldRow` auf mehrere Datensätze an.
 *
 * @param rows - Nebengeld-Datensätze.
 * @returns Ergänzte Kopien (siehe `hydrateNebengeldRow`).
 */
export function hydrateNebengeldRows(rows: IDatenN[]): IDatenN[] {
  return rows.map(hydrateNebengeldRow);
}

/**
 * Prüft Zulagen gegen die Katalogregeln: Höchstanzahl pro Tag, Mindestminuten pro Tag und Ausschluss anderer Zulagen derselben Kategorie.
 *
 * @param zulagen - Erfasste Zulagen; Werte von 0 oder weniger werden ignoriert.
 * @returns Fehlermeldungen; leer, wenn alles zulässig ist.
 */
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

/**
 * Liest die Zulagen-Eingaben aus dem Formular.
 *
 * @param form - Container mit den Inputs `data-zulage-input-code`.
 * @returns Zulagen mit positivem Zahlenwert; leere oder ungültige Felder entfallen.
 */
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
