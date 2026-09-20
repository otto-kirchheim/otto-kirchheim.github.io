import { default as normalizeResourceRows } from '@/infrastructure/data/normalizeResourceRows';
import { resourceByStorageKey } from '@/infrastructure/data/resourceConfig';
import type { TStorageData } from '@/infrastructure/storage/Storage';

/**
 * Erkennt Fehlermeldungen, die auf eine ungültige/abgelaufene Session hindeuten.
 *
 * @param message - Fehlertext.
 * @returns `true`, wenn er auf Session-/Token-Probleme passt.
 */
export function isSessionErrorMessage(message: string): boolean {
  return /session ungültig|abgemeldet|token|erneuerung/i.test(message);
}

/**
 * Bringt Rohdaten in Array-Form: Arrays bleiben, ein Objekt aus Arrays (je Monat/Schlüssel)
 * wird flach zusammengeführt, alles andere ergibt `[]` (siehe `normalizeResourceRows`).
 *
 * @typeParam T - Zeilentyp.
 * @param rows - Rohdaten aus Storage oder Server.
 * @returns Zeilen-Array.
 */
export function normalizeRows<T>(rows: unknown): T[] {
  return normalizeResourceRows<T>(rows);
}

/**
 * Prüft, ob ein Wert ein Objekt mit String-`_id` ist, also schon auf dem Server existiert.
 *
 * @param value - Zu prüfender Wert.
 */
function hasStringId(value: unknown): boolean {
  return typeof value === 'object' && value !== null && typeof (value as { _id?: unknown })._id === 'string';
}

/**
 * Serialisiert eine Zeile stabil (Schlüssel sortiert) ohne Metafelder (`__*`, `_id`,
 * `updatedAt`, `createdAt`) und ohne `undefined`, damit Zeilen mit und ohne Id vergleichbar sind.
 *
 * @param row - Zeile oder beliebiger Wert (rekursiv).
 * @returns Kanonischer String.
 */
function serializeRowWithoutMeta(row: unknown): string {
  if (row === null || row === undefined) return JSON.stringify(row);
  if (typeof row !== 'object') return JSON.stringify(row);
  if (Array.isArray(row)) return `[${row.map(item => serializeRowWithoutMeta(item)).join(',')}]`;

  const normalized = Object.entries(row as Record<string, unknown>)
    .filter(
      ([key, value]) =>
        !key.startsWith('__') && !['_id', 'updatedAt', 'createdAt', '__v'].includes(key) && value !== undefined,
    )
    .sort(([left], [right]) => left.localeCompare(right));

  return `{${normalized.map(([key, value]) => `${JSON.stringify(key)}:${serializeRowWithoutMeta(value)}`).join(',')}}`;
}

/**
 * Erkennt lokale Zeilen ohne `_id`, die inhaltlich exakt den Serverzeilen entsprechen. Dann
 * werden die lokalen Daten durch die Serverdaten (mit Ids) ersetzt.
 *
 * @param storageName - Storage-Key; nur monatsbezogene Ressourcen kommen in Frage.
 * @param localData - Lokale Rohdaten.
 * @param serverData - Serverseitige Rohdaten.
 * @returns `true`, wenn gleich viele Zeilen, lokal mindestens eine ohne Id, alle Serverzeilen mit
 *   Id und die Inhalte (ohne Metafelder) uebereinstimmen.
 */
export function shouldRepairMissingIds(storageName: TStorageData, localData: unknown, serverData: unknown): boolean {
  if (!resourceByStorageKey(storageName)) return false;

  const localRows = normalizeRows<Record<string, unknown>>(localData);
  const serverRows = normalizeRows<Record<string, unknown>>(serverData);

  if (localRows.length === 0 || localRows.length !== serverRows.length) return false;
  if (!localRows.some(row => !hasStringId(row))) return false;
  if (!serverRows.every(row => hasStringId(row))) return false;

  const localSignatures = localRows.map(serializeRowWithoutMeta).sort();
  const serverSignatures = serverRows.map(serializeRowWithoutMeta).sort();

  return localSignatures.every((signature, index) => signature === serverSignatures[index]);
}

/**
 * Zählt die bereits auf dem Server bekannten Zeilen (mit `_id`, ohne Pending-New/-Deleted)
 * je Monat. Monat 0 sammelt Zeilen ohne erkennbaren Monat.
 *
 * @param rows - Rohdaten der Ressource.
 * @param storageName - Storage-Key der Ressource (bestimmt die Monatsermittlung).
 * @returns Map Monat (1-12, 0 = unbekannt) -> Anzahl.
 */
export function countByMonth(rows: unknown, storageName: TStorageData): Map<number, number> {
  const normalized = normalizeRows(rows);
  const monthCount = new Map<number, number>();

  normalized.forEach(row => {
    if (!row || typeof row !== 'object') return;
    // Pending-Delete-Rows nicht mitzählen — sie existieren noch auf dem Server.
    if ((row as Record<string, unknown>).__localState === 'deleted') return;
    // Pending-New-Rows nicht mitzählen — sie existieren noch nicht auf dem Server und werden
    // nach dem Tabellen-Load automatisch nachgespeichert (`Rows.load` -> AutoSave).
    // Die `_id`-Prüfung darunter fängt zusätzlich Alt-Daten ohne `__localState` ab.
    if ((row as Record<string, unknown>).__localState === 'new') return;
    if (!hasStringId(row)) return;
    const m = resourceByStorageKey(storageName)?.monatOf(row) ?? -1;

    const bucket = m > 0 ? m : 0;
    monthCount.set(bucket, (monthCount.get(bucket) ?? 0) + 1);
  });

  return monthCount;
}

/**
 * Prüft, ob eine Zeile zum Monat gehört.
 *
 * @param storageName - Storage-Key der Ressource.
 * @param row - Zeile.
 * @param month - Monat 1-12; 0 steht für Zeilen ohne erkennbaren Monat.
 * @returns `true` bei Treffer; `false` auch für unbekannte Storage-Keys oder leere Zeile.
 */
export function rowMatchesMonth(storageName: TStorageData, row: unknown, month: number): boolean {
  const resource = resourceByStorageKey(storageName);
  if (!resource || !row) return false;

  const m = resource.monatOf(row);
  return month === 0 ? m <= 0 : m === month;
}
