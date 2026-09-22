import { featureRegistry } from '@/shared/lib/feature';
import type { FeatureResource, FeatureResourceKey } from '@/shared/lib/feature';
import type { TStorageData } from '../../shared/lib/storage/Storage';

export type ResourceKind = FeatureResourceKey;

/**
 * Liefert die Ressourcen aller angemeldeten Features (Quelle: `meta.resources`, Reihenfolge nach `meta.order`).
 *
 * @returns Ressourcen; ohne angemeldete Features leer.
 */
export function resourceDefs(): FeatureResource[] {
  return featureRegistry.resources();
}

/**
 * Liefert die Schluessel aller angemeldeten Ressourcen.
 *
 * @returns Ressourcen-Schluessel in Feature-Reihenfolge.
 */
export function resourceKeys(): ResourceKind[] {
  return resourceDefs().map(resource => resource.key);
}

/**
 * Liefert die Beschreibung einer Ressource.
 *
 * @param key - Ressourcen-Schluessel.
 * @returns Die Beschreibung.
 * @throws {Error} Wenn kein angemeldetes Feature die Ressource besitzt (Manifest `app/features.ts` pruefen).
 */
export function resourceDef(key: ResourceKind): FeatureResource {
  const resource = resourceDefs().find(candidate => candidate.key === key);
  if (!resource) throw new Error(`Ressource '${key}' ist von keinem Feature angemeldet`);
  return resource;
}

/**
 * Sucht die Ressource zu einem Storage-Key.
 *
 * @param storageKey - Storage-Key, z. B. `dataBZ`.
 * @returns Die Beschreibung oder `undefined` (z. B. fuer `VorgabenU`).
 */
export function resourceByStorageKey(storageKey: string): FeatureResource | undefined {
  return resourceDefs().find(resource => resource.storageKey === storageKey);
}

/**
 * Storage-Key einer Ressource.
 *
 * @param key - Ressourcen-Schluessel.
 * @returns Der Storage-Key.
 */
export function storageKeyOf(key: ResourceKind): TStorageData {
  return resourceDef(key).storageKey as TStorageData;
}

/**
 * Id der Tabelle einer Ressource.
 *
 * @param key - Ressourcen-Schluessel.
 * @returns Die Tabellen-Id (ohne `#`).
 */
export function tableIdOf(key: ResourceKind): string {
  return resourceDef(key).tableId;
}

/**
 * Ob eine Zeile in den Monat faellt (Tabellenfilter der Ressource).
 *
 * @param resource - Beschreibung der Ressource.
 * @param row - Zeile.
 * @param monat - Monat (1-12).
 * @returns `true` bei Treffer.
 */
export function isRowInMonat(resource: FeatureResource, row: unknown, monat: number): boolean {
  return resource.inMonat ? resource.inMonat(row, monat) : resource.monatOf(row) === monat;
}
