import type { CustomHTMLTableElement, IDatenEWT, TResourceKey } from '@/types';
import { default as Storage, type TStorageData } from '@/shared/lib/storage/Storage';
import { publishEvent } from '@/core';

/**
 * Übernimmt geänderte EWT-Felder (z.B. Beginn/Ende oder eine daraus abgeleitete Dauer) in eine
 * abhängige Ressource (Neben/EA), die per `EWT`-Referenz verknüpft ist — sowohl im Storage als
 * auch in der ggf. gerade geöffneten Live-`CustomTable`. Nur `deriveFields` (welche Felder aus
 * dem EWT-Datensatz abgeleitet werden) ist pro Ressource unterschiedlich. Ohne Änderung im Storage
 * bleibt auch die Tabelle unberührt.
 *
 * @typeParam T - Zeilentyp der abhängigen Ressource.
 * @param updatedEwtRows - Geänderte EWT-Zeilen; Zeilen ohne `_id` werden ignoriert.
 * @param config - `storageKey`/`tableId`/`resource` der abhängigen Ressource und `deriveFields`,
 *   das aus einer EWT-Zeile die zu übernehmenden Felder liefert.
 */
export function syncFieldsFromEwtRows<T extends { EWT?: string }>(
  updatedEwtRows: IDatenEWT[],
  config: {
    storageKey: TStorageData;
    tableId: string;
    resource: TResourceKey;
    deriveFields: (ewt: IDatenEWT) => Partial<T>;
  },
): void {
  if (updatedEwtRows.length === 0) return;

  const ewtById = new Map<string, IDatenEWT>(updatedEwtRows.filter(e => e._id).map(e => [e._id as string, e]));

  /**
   * Prüft, ob `patch` mindestens einen Wert enthält, der vom aktuellen Zielwert abweicht.
   *
   * @param target - Aktuelle Zeile.
   * @param patch - Abgeleitete Felder.
   * @returns `true`, wenn ein Feld abweicht.
   */
  function hasChanges(target: T, patch: Partial<T>): boolean {
    return Object.entries(patch).some(([key, value]) => (target as Record<string, unknown>)[key] !== value);
  }

  const currentData = Storage.get<T[]>(config.storageKey, { default: [] });
  let storageChanged = false;
  const nextData = currentData.map(item => {
    if (!item.EWT) return item;
    const ewt = ewtById.get(item.EWT);
    if (!ewt) return item;
    const patch = config.deriveFields(ewt);
    if (!hasChanges(item, patch)) return item;
    storageChanged = true;
    return { ...item, ...patch };
  });

  if (!storageChanged) return;
  Storage.set(config.storageKey, nextData);

  const el = document.querySelector<CustomHTMLTableElement<T>>(`#${config.tableId}`);
  const table = el?.instance ?? null;
  if (!table) return;

  const tableChanged = table.rows.patchCellsAsModified(row => {
    const ref = (row.cells as T).EWT;
    if (!ref) return null;
    const ewt = ewtById.get(ref);
    if (!ewt) return null;
    const patch = config.deriveFields(ewt);
    if (!hasChanges(row.cells as T, patch)) return null;
    return { ...row.cells, ...patch };
  });
  if (tableChanged && typeof table.drawRows === 'function') table.drawRows();
  if (tableChanged) publishEvent('data:changed', { resource: config.resource, action: 'update' });
}
