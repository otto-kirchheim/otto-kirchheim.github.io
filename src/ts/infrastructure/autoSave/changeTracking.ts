import type { CustomTable, CustomTableTypes } from '../../class/CustomTable';
import type {
  BackendBereitschaftseinsatz,
  BackendBereitschaftszeitraum,
  BackendEWT,
  BackendNebengeld,
} from '../data/fieldMapper';
import { beFromBackend, bzFromBackend, ewtFromBackend, nebengeldFromBackend } from '../data/fieldMapper';
import type { TResourceKey } from '../../interfaces';
import { v4 as uuidv4 } from 'uuid';

export function mapServerDocToFrontend(resource: Exclude<TResourceKey, 'settings'>, doc: unknown): CustomTableTypes {
  switch (resource) {
    case 'BZ':
      return bzFromBackend(doc as BackendBereitschaftszeitraum);
    case 'BE':
      return beFromBackend(doc as BackendBereitschaftseinsatz);
    case 'EWT':
      return ewtFromBackend(doc as BackendEWT);
    case 'N':
      return nebengeldFromBackend(doc as BackendNebengeld);
  }
}

export function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(item => stableSerialize(item)).join(',')}]`;

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const entries = keys.map(key => `${JSON.stringify(key)}:${stableSerialize(obj[key])}`);
  return `{${entries.join(',')}}`;
}

export function createClientRequestId(): string {
  return uuidv4();
}

export function rowSignature(resource: Exclude<TResourceKey, 'settings'>, row: CustomTableTypes): string {
  const source = row as Record<string, unknown>;
  const omitKeys = new Set<string>(['_id', 'updatedAt', 'createdAt', '__v']);

  // Serverseitig ergänzte/verknüpfte Felder sollen das Create-Matching nicht stören.
  if (resource === 'BE') omitKeys.add('bereitschaftszeitraumBE');
  if (resource === 'N') omitKeys.add('ewtRef');

  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (omitKeys.has(key)) continue;
    if (value === undefined) continue;
    normalized[key] = value;
  }

  return stableSerialize(normalized);
}

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

export function mapCreatedIdsByClientRequestId(
  table: CustomTable<CustomTableTypes>,
  createdReferences: { _id: string; clientRequestId: string }[],
): Map<number, string> {
  const createdIds = new Map<number, string>();
  if (createdReferences.length === 0) return createdIds;

  const idByClientRequestId = new Map(createdReferences.map(entry => [entry.clientRequestId, entry._id]));
  const pendingNewRows = table.rows.array.filter(row => row._state === 'new');

  pendingNewRows.forEach((row, idx) => {
    if (!row._clientRequestId) return;
    const createdId = idByClientRequestId.get(row._clientRequestId);
    if (createdId) createdIds.set(idx, createdId);
  });

  return createdIds;
}

export function mapCreatedIdsByContent(
  resource: Exclude<TResourceKey, 'settings'>,
  table: CustomTable<CustomTableTypes>,
  createdDocs: unknown[],
): Map<number, string> {
  const createdIds = new Map<number, string>();
  if (createdDocs.length === 0) return createdIds;

  const pendingNewRows = table.rows.array.filter(row => row._state === 'new');

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
