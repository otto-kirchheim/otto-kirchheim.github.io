import { unwrapEnvelope } from '@/core';
import type { ApiHttpResponse } from '@/core';
import { FetchRetry } from './FetchRetry';

export type ResourceName =
  'bereitschaftszeitraum' | 'bereitschaftseinsatz' | 'einsatzwechseltaetigkeit' | 'nebengeld' | 'ea';

/** Bulk-Operation Request */
export interface BulkRequest<TCreate = unknown, TUpdate = unknown> {
  create?: TCreate[];
  update?: (TUpdate & { _id: string })[];
  delete?: string[];
}

export interface BulkErrorEntry {
  operation: 'create' | 'update' | 'delete';
  index?: number;
  id?: string;
  clientRequestId?: string;
  message: string;
  /** Frontend-only: menschenlesbare Zeilenbeschreibung für den Fehlerdialog. */
  label?: string;
}

/** Bulk-Operation Response */
export interface BulkResponse<T = unknown> {
  created: T[];
  updated: T[];
  deleted: string[];
  createdReferences?: { _id: string; clientRequestId: string }[];
  errors: BulkErrorEntry[];
}

/**
 * Ruft die API über `FetchRetry` auf und liefert die entpackte `data` der Antwort.
 *
 * @typeParam I - Typ des Request-Bodys.
 * @typeParam T - Typ der Antwortdaten.
 * @param path - Pfad relativ zur API-URL, ohne führenden Slash.
 * @param data - Optionaler JSON-Body.
 * @param method - HTTP-Methode; Standard `GET`.
 * @returns `data` des Antwort-Envelopes.
 * @throws {Error} Bei Netz-/Fetch-Fehlern oder einer Fehlerantwort (Status ab 400).
 */
export async function apiFetch<I, T>(
  path: string,
  data?: I,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
): Promise<T> {
  const result = await FetchRetry<I, T>(path, data, method);
  if (result instanceof Error) throw result;
  return unwrapEnvelope(result as unknown as ApiHttpResponse<T>);
}

/**
 * Lädt alle Dokumente einer Ressource für ein Jahr, mappt sie ins Frontend-Format und ermittelt den jüngsten `updatedAt`-Zeitstempel (für den Sync-Vergleich).
 *
 * @typeParam TBackend - Backend-Dokumenttyp.
 * @typeParam TFrontend - Frontend-Zeilentyp.
 * @param resource - Ressourcenname als API-Pfadsegment.
 * @param year - Jahr.
 * @param mapper - Wandelt ein Backend-Dokument in eine Frontend-Zeile.
 * @returns Gemappte Zeilen und der größte `updatedAt`-Wert (`null` ohne Zeitstempel).
 */
export async function loadResourceYear<TBackend extends { updatedAt?: string }, TFrontend>(
  resource: ResourceName,
  year: number,
  mapper: (doc: TBackend) => TFrontend,
): Promise<{ data: TFrontend[]; maxUpdatedAt: string | null }> {
  const docs = await apiFetch<undefined, TBackend[]>(`${resource}/${year}`);
  const data = docs.map(mapper);
  const timestamps = docs.map(d => d.updatedAt).filter((t): t is string => !!t);
  const maxUpdatedAt = timestamps.length > 0 ? timestamps.reduce((a, b) => (a > b ? a : b)) : null;
  return { data, maxUpdatedAt };
}

/**
 * Sendet Anlegen, Ändern und Löschen einer Ressource gebündelt an `<resource>/bulk`.
 *
 * @typeParam TBackend - Backend-Dokumenttyp.
 * @param resource - Ressourcenname als API-Pfadsegment.
 * @param bulk - Zu sendende Änderungen.
 * @returns Ergebnis je Operation samt Fehlern.
 */
export async function bulkResource<TBackend>(
  resource: ResourceName,
  bulk: BulkRequest,
): Promise<BulkResponse<TBackend>> {
  return apiFetch<BulkRequest, BulkResponse<TBackend>>(`${resource}/bulk`, bulk, 'POST');
}

/**
 * Legt ein einzelnes Dokument an (`POST <resource>`).
 *
 * @typeParam TBackend - Backend-Dokumenttyp.
 * @param resource - Ressourcenname als API-Pfadsegment.
 * @param data - Neues Dokument.
 * @returns Angelegtes Dokument.
 */
async function createResource<TBackend>(resource: ResourceName, data: unknown): Promise<TBackend> {
  return apiFetch<unknown, TBackend>(resource, data, 'POST');
}

/**
 * Ersetzt die Felder eines Dokuments (`PUT <resource>/<id>`).
 *
 * @typeParam TBackend - Backend-Dokumenttyp.
 * @param resource - Ressourcenname als API-Pfadsegment.
 * @param id - `_id` des Dokuments.
 * @param data - Zu schreibende Felder.
 * @returns Aktualisiertes Dokument.
 */
async function updateResource<TBackend>(resource: ResourceName, id: string, data: unknown): Promise<TBackend> {
  return apiFetch<unknown, TBackend>(`${resource}/${id}`, data, 'PUT');
}

/**
 * Löscht ein einzelnes Dokument (`DELETE <resource>/<id>`).
 *
 * @param resource - Ressourcenname als API-Pfadsegment.
 * @param id - `_id` des Dokuments.
 */
async function deleteResource(resource: ResourceName, id: string): Promise<void> {
  await apiFetch<undefined, unknown>(`${resource}/${id}`, undefined, 'DELETE');
}

/**
 * Sendet Änderungen: genau eine Operation läuft über den passenden Einzel-Endpunkt, alle anderen Fälle (auch keine) über Bulk. Das Ergebnis hat immer die Form der Bulk-Antwort.
 *
 * @typeParam TBackend - Backend-Dokumenttyp.
 * @param resource - Ressourcenname als API-Pfadsegment.
 * @param bulk - Zu sendende Änderungen.
 * @returns Bulk-förmige Antwort; beim Einzel-Create mit `createdReferences` aus `clientRequestId` und neuer `_id`.
 */
export async function smartSync<TBackend>(resource: ResourceName, bulk: BulkRequest): Promise<BulkResponse<TBackend>> {
  const createCount = bulk.create?.length ?? 0;
  const updateCount = bulk.update?.length ?? 0;
  const deleteCount = bulk.delete?.length ?? 0;
  const total = createCount + updateCount + deleteCount;

  if (total !== 1) return bulkResource<TBackend>(resource, bulk);

  if (createCount === 1) {
    const createItem = bulk.create![0] as Record<string, unknown>;
    const doc = await createResource<TBackend>(resource, createItem);
    const createdId = (doc as Record<string, unknown>)._id;
    const clientRequestId = createItem.clientRequestId;
    return {
      created: [doc],
      updated: [],
      deleted: [],
      createdReferences:
        typeof createdId === 'string' && typeof clientRequestId === 'string'
          ? [{ _id: createdId, clientRequestId }]
          : [],
      errors: [],
    };
  }

  if (updateCount === 1) {
    const { _id, ...fields } = bulk.update![0] as Record<string, unknown> & { _id: string };
    const doc = await updateResource<TBackend>(resource, _id, fields);
    return { created: [], updated: [doc], deleted: [], createdReferences: [], errors: [] };
  }

  const id = bulk.delete![0];
  await deleteResource(resource, id);
  return { created: [], updated: [], deleted: [id], createdReferences: [], errors: [] };
}
