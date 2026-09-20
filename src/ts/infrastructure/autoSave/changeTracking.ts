import type { CustomTable, CustomTableTypes, Row } from '../table/CustomTable';
import { resourceDef } from '../data/resourceConfig';
import type { TResourceKey } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Wandelt ein Backend-Dokument der Ressource ins Frontend-Format.
 *
 * @param resource - Ressource (nicht `settings`).
 * @param doc - Backend-Dokument; wird ungeprüft auf den Backend-Typ der Ressource gecastet.
 * @returns Frontend-Zeile.
 */
export function mapServerDocToFrontend(resource: Exclude<TResourceKey, 'settings'>, doc: unknown): CustomTableTypes {
  return resourceDef(resource).api.fromBackend(doc) as CustomTableTypes;
}

/**
 * Serialisiert einen Wert als JSON mit alphabetisch sortierten Objekt-Schlüsseln, sodass gleicher Inhalt unabhängig von der Schlüsselreihenfolge denselben String ergibt.
 *
 * @param value - Beliebiger JSON-artiger Wert.
 * @returns Serialisierter String.
 */
export function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(item => stableSerialize(item)).join(',')}]`;

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const entries = keys.map(key => `${JSON.stringify(key)}:${stableSerialize(obj[key])}`);
  return `{${entries.join(',')}}`;
}

/**
 * Erzeugt die `clientRequestId` (UUID v4), über die der Server ein angelegtes Dokument der lokalen Zeile zuordnen kann.
 *
 * @returns Neue UUID.
 */
export function createClientRequestId(): string {
  return uuidv4();
}

/**
 * Bildet eine Inhalts-Signatur der Zeile ohne `_id`, Zeitstempel und `__v` (sowie `signatureOmitKeys` der Ressource), um Zeilen mit Server-Dokumenten abzugleichen.
 *
 * @param resource - Ressource (nicht `settings`).
 * @param row - Zellen der Zeile oder Server-Dokument im Frontend-Format.
 * @returns Signatur-String.
 */
export function rowSignature(resource: Exclude<TResourceKey, 'settings'>, row: CustomTableTypes): string {
  const source = row as Record<string, unknown>;
  const omitKeys = new Set<string>(['_id', 'updatedAt', 'createdAt', '__v']);

  // Serverseitig ergänzte/verknüpfte Felder (`meta.signatureOmitKeys`) sollen das Create-Matching nicht stören.
  for (const key of resourceDef(resource).signatureOmitKeys ?? []) omitKeys.add(key);

  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (omitKeys.has(key)) continue;
    if (value === undefined) continue;
    normalized[key] = value;
  }

  return stableSerialize(normalized);
}

/**
 * Ergänzt jedes Create-Item um eine `clientRequestId`: Items übernehmen per Inhalts-Signatur die `_clientRequestId` der neuen Tabellenzeilen (an der Zeile bei Bedarf erzeugt), ohne Treffer gibt es eine frische Id.
 *
 * @param resource - Ressource (nicht `settings`).
 * @param table - Tabelle mit den neuen Zeilen (`_state === 'new'`).
 * @param createItems - Zu sendende Create-Items.
 * @returns Create-Items mit `clientRequestId`, in derselben Reihenfolge.
 */
export function buildCreatePayloadWithClientRequestId(
  resource: Exclude<TResourceKey, 'settings'>,
  table: CustomTable<CustomTableTypes>,
  createItems: CustomTableTypes[],
): (CustomTableTypes & { clientRequestId: string })[] {
  const pendingNewRows = table.rows.array.filter(row => row._state === 'new');
  const idsBySignature = new Map<string, string[]>();

  for (const row of pendingNewRows) {
    if (!row._clientRequestId) row._clientRequestId = createClientRequestId();
    const signature = rowSignature(resource, row.cells);
    const queue = idsBySignature.get(signature) ?? [];
    queue.push(row._clientRequestId);
    idsBySignature.set(signature, queue);
  }

  return createItems.map(item => {
    const signature = rowSignature(resource, item);
    const queue = idsBySignature.get(signature);
    const clientRequestId = queue?.shift() ?? createClientRequestId();
    return { ...item, clientRequestId };
  });
}

/**
 * Ordnet neuen Zeilen die vom Server vergebene `_id` über die `clientRequestId` zu.
 *
 * @param createRows - Gesendete neue Zeilen.
 * @param createdReferences - Vom Server gelieferte Paare aus `_id` und `clientRequestId`.
 * @returns Zeilenindex in `createRows` auf `_id`; nur für Zeilen mit Treffer.
 */
export function mapCreatedIdsByClientRequestId(
  createRows: Row<CustomTableTypes>[],
  createdReferences: { _id: string; clientRequestId: string }[],
): Map<number, string> {
  const createdIds = new Map<number, string>();
  if (createdReferences.length === 0) return createdIds;

  const idByClientRequestId = new Map(createdReferences.map(entry => [entry.clientRequestId, entry._id]));

  createRows.forEach((row, idx) => {
    if (!row._clientRequestId) return;
    const createdId = idByClientRequestId.get(row._clientRequestId);
    if (createdId) createdIds.set(idx, createdId);
  });

  return createdIds;
}

/**
 * Ausweichlösung, wenn `clientRequestId` nichts zuordnet: gleicht neue Zeilen und angelegte Server-Dokumente über die Inhalts-Signatur ab. Zeilen ohne Treffer erhalten der Reihe nach die übrigen Server-Ids.
 *
 * @param resource - Ressource (nicht `settings`).
 * @param createRows - Gesendete neue Zeilen.
 * @param createdDocs - Vom Server angelegte Dokumente im Backend-Format.
 * @returns Zeilenindex in `createRows` auf `_id`.
 */
export function mapCreatedIdsByContent(
  resource: Exclude<TResourceKey, 'settings'>,
  createRows: Row<CustomTableTypes>[],
  createdDocs: unknown[],
): Map<number, string> {
  const createdIds = new Map<number, string>();
  if (createdDocs.length === 0) return createdIds;

  const pendingNewRows = createRows;

  const serverRows = createdDocs
    .map(doc => {
      try {
        const row = mapServerDocToFrontend(resource, doc);
        const id = (row as { _id?: string })._id;
        if (!id) return null;
        return { id, signature: rowSignature(resource, row) };
      } catch {
        return null;
      }
    })
    .filter((entry): entry is { id: string; signature: string } => entry !== null);

  const idsBySignature = new Map<string, string[]>();
  for (const entry of serverRows) {
    const queue = idsBySignature.get(entry.signature) ?? [];
    queue.push(entry.id);
    idsBySignature.set(entry.signature, queue);
  }

  const unassignedDocIds = [...serverRows.map(entry => entry.id)];

  pendingNewRows.forEach((row, idx) => {
    const signature = rowSignature(resource, row.cells);
    const queue = idsBySignature.get(signature);
    const matchedId = queue?.shift();

    if (matchedId) {
      createdIds.set(idx, matchedId);
      const removeIdx = unassignedDocIds.indexOf(matchedId);
      if (removeIdx >= 0) unassignedDocIds.splice(removeIdx, 1);
      return;
    }

    const fallbackId = unassignedDocIds.shift();
    if (fallbackId) createdIds.set(idx, fallbackId);
  });

  return createdIds;
}
