import { unwrapEnvelope } from '@/core';
import type { ApiHttpResponse } from '@/core';
import { FetchRetry } from './FetchRetry';

export type ResourceName =
  | 'bereitschaftszeitraum'
  | 'bereitschaftseinsatz'
  | 'einsatzwechseltaetigkeit'
  | 'nebengeld';

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
}

/** Bulk-Operation Response */
export interface BulkResponse<T = unknown> {
  created: T[];
  updated: T[];
  deleted: string[];
  createdReferences?: { _id: string; clientRequestId: string }[];
  errors: BulkErrorEntry[];
}

export async function apiFetch<I, T>(
  path: string,
  data?: I,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
): Promise<T> {
  const result = await FetchRetry<I, T>(path, data, method);
  if (result instanceof Error) throw result;
  return unwrapEnvelope(result as unknown as ApiHttpResponse<T>);
}

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

export async function bulkResource<TBackend>(
  resource: ResourceName,
  bulk: BulkRequest,
): Promise<BulkResponse<TBackend>> {
  return apiFetch<BulkRequest, BulkResponse<TBackend>>(`${resource}/bulk`, bulk, 'POST');
}

async function createResource<TBackend>(resource: ResourceName, data: unknown): Promise<TBackend> {
  return apiFetch<unknown, TBackend>(resource, data, 'POST');
}

async function updateResource<TBackend>(resource: ResourceName, id: string, data: unknown): Promise<TBackend> {
  return apiFetch<unknown, TBackend>(`${resource}/${id}`, data, 'PUT');
}

async function deleteResource(resource: ResourceName, id: string): Promise<void> {
  await apiFetch<undefined, unknown>(`${resource}/${id}`, undefined, 'DELETE');
}

export async function smartSync<TBackend>(
  resource: ResourceName,
  bulk: BulkRequest,
): Promise<BulkResponse<TBackend>> {
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
