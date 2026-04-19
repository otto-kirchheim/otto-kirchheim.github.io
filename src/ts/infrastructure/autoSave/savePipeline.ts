import type { CustomTable, CustomTableTypes, Row, TableChanges } from '../../class/CustomTable';
import type { CustomHTMLTableElement, IDatenBE, IDatenBZ, IDatenEWT, IDatenN, TResourceKey } from '../../interfaces';
import {
  type BulkErrorEntry,
  type BulkRequest,
  bereitschaftseinsatzApi,
  bereitschaftszeitraumApi,
  ewtApi,
  nebengeldApi,
} from '../api/apiService';
import Storage from '../storage/Storage';
import dayjs from '../date/configDayjs';
import { RESOURCE_TABLE_ID_MAP } from '../data/resourceConfig';
import { buildCreatePayloadWithClientRequestId, mapServerDocToFrontend } from './changeTracking';

export type ErrorSourceState = 'new' | 'modified' | 'deleted';

export interface RowErrorMatch {
  row: Row<CustomTableTypes>;
  error: BulkErrorEntry;
  sourceState: ErrorSourceState;
}

const ERROR_OPERATION_STATE_MAP: Record<BulkErrorEntry['operation'], ErrorSourceState> = {
  create: 'new',
  update: 'modified',
  delete: 'deleted',
};

export function findTable<T extends CustomTableTypes>(id: string): CustomTable<T> | null {
  const el = document.querySelector<CustomHTMLTableElement<T>>(`#${id}`);
  return el?.instance ?? null;
}

export function applyServerRowsToTable(
  resource: Exclude<TResourceKey, 'settings'>,
  table: CustomTable<CustomTableTypes>,
  result: { created?: unknown[]; updated?: unknown[] },
): void {
  const serverRowsById = new Map<string, CustomTableTypes>();

  [...(result.created ?? []), ...(result.updated ?? [])].forEach(doc => {
    try {
      const row = mapServerDocToFrontend(resource, doc);
      const id = (row as { _id?: string })._id;
      if (id) serverRowsById.set(id, row);
    } catch {
      // Bei unvollständigen Dokumenten den Sync überspringen und den lokalen Zustand behalten.
    }
  });

  for (const row of table.rows.array) {
    if (row._state === 'deleted' || !row._id) continue;
    const serverRow = serverRowsById.get(row._id);
    if (!serverRow) continue;
    row.cells = serverRow;
    row._originalCells = { ...serverRow };
  }

  if (typeof table.drawRows === 'function') table.drawRows();
}

export function collectRowErrorMatches(
  table: CustomTable<CustomTableTypes>,
  errors: BulkErrorEntry[],
): RowErrorMatch[] {
  const matches: RowErrorMatch[] = [];

  for (const error of errors) {
    let row: Row<CustomTableTypes> | undefined;

    if (error.operation === 'create' && error.clientRequestId) {
      row = table.rows.array.find(candidate => candidate._clientRequestId === error.clientRequestId);
    }

    if (!row && error.id) {
      row = table.rows.array.find(candidate => candidate._id === error.id);
    }

    if (!row) continue;
    matches.push({ row, error, sourceState: ERROR_OPERATION_STATE_MAP[error.operation] });
  }

  return matches;
}

export function unlinkNebengeldRefsForDeletedEwtIds(deletedIds: string[]): void {
  if (deletedIds.length === 0) return;

  const deletedIdSet = new Set(deletedIds);

  const currentDataN = Storage.get<IDatenN[]>('dataN', { default: [] });
  let storageChanged = false;
  const nextDataN = currentDataN.map(item => {
    if (!item.ewtRef || !deletedIdSet.has(item.ewtRef)) return item;
    storageChanged = true;
    const { ewtRef: _removed, ...withoutRef } = item;
    return withoutRef as IDatenN;
  });
  if (storageChanged) {
    Storage.set('dataN', nextDataN);
  }

  const nebenTable = findTable<IDatenN>(RESOURCE_TABLE_ID_MAP.N);
  if (!nebenTable) return;

  let tableChanged = false;
  for (const row of nebenTable.rows.array) {
    if (row._state === 'deleted') continue;
    const ref = (row.cells as IDatenN).ewtRef;
    if (!ref || !deletedIdSet.has(ref)) continue;

    const { ewtRef: _removed, ...withoutRef } = row.cells as IDatenN;
    row.cells = withoutRef as IDatenN;
    if (row._state === 'unchanged') {
      row._originalCells = { ...(withoutRef as IDatenN) };
    }
    tableChanged = true;
  }

  if (tableChanged && typeof nebenTable.drawRows === 'function') nebenTable.drawRows();
}

export async function sendBulk(
  resource: Exclude<TResourceKey, 'settings'>,
  table: CustomTable<CustomTableTypes>,
  changes: TableChanges<CustomTableTypes>,
  monat: number,
  jahr: number,
): Promise<{
  created: CustomTableTypes[];
  updated: CustomTableTypes[];
  deleted: string[];
  createdReferences?: { _id: string; clientRequestId: string }[];
  errors: BulkErrorEntry[];
}> {
  type SavePeriod = { monat: number; jahr: number };

  const getPeriod = (item: CustomTableTypes): SavePeriod => {
    const fallback = { monat, jahr };

    switch (resource) {
      case 'BZ': {
        const parsed = dayjs(String((item as IDatenBZ).beginB));
        return parsed.isValid() ? { monat: parsed.month() + 1, jahr: parsed.year() } : fallback;
      }
      case 'BE': {
        const parsed = dayjs((item as IDatenBE).tagBE, 'DD.MM.YYYY', true);
        return parsed.isValid() ? { monat: parsed.month() + 1, jahr: parsed.year() } : fallback;
      }
      case 'EWT': {
        const parsed = dayjs((item as IDatenEWT).tagE, 'YYYY-MM-DD', true);
        return parsed.isValid() ? { monat: parsed.month() + 1, jahr: parsed.year() } : fallback;
      }
      case 'N': {
        const parsed = dayjs((item as IDatenN).tagN, 'DD.MM.YYYY', true);
        return parsed.isValid() ? { monat: parsed.month() + 1, jahr: parsed.year() } : fallback;
      }
    }
  };

  const createItems = buildCreatePayloadWithClientRequestId(resource, table, changes.create);

  const createByPeriod = new Map<string, (CustomTableTypes & { clientRequestId: string })[]>();
  const updateByPeriod = new Map<string, (CustomTableTypes & { _id: string })[]>();
  const periods = new Map<string, SavePeriod>();

  const toPeriodKey = (period: SavePeriod): string => `${period.jahr}-${period.monat}`;

  for (const item of createItems) {
    const period = getPeriod(item);
    const key = toPeriodKey(period);
    const arr = createByPeriod.get(key) ?? [];
    arr.push(item);
    createByPeriod.set(key, arr);
    periods.set(key, period);
  }

  for (const item of changes.update as (CustomTableTypes & { _id: string })[]) {
    const period = getPeriod(item);
    const key = toPeriodKey(period);
    const arr = updateByPeriod.get(key) ?? [];
    arr.push(item);
    updateByPeriod.set(key, arr);
    periods.set(key, period);
  }

  const sortedPeriods = Array.from(periods.values()).sort((a, b) => {
    if (a.jahr !== b.jahr) return a.jahr - b.jahr;
    return a.monat - b.monat;
  });

  const combined: {
    created: CustomTableTypes[];
    updated: CustomTableTypes[];
    deleted: string[];
    createdReferences?: { _id: string; clientRequestId: string }[];
    errors: BulkErrorEntry[];
  } = { created: [], updated: [], deleted: [], createdReferences: [], errors: [] };

  const callBulk = async (period: SavePeriod, withDelete: boolean) => {
    const key = toPeriodKey(period);
    const bulk: BulkRequest = {
      create: createByPeriod.get(key) ?? [],
      update: updateByPeriod.get(key) ?? [],
      delete: withDelete ? changes.delete : [],
    };

    switch (resource) {
      case 'BZ':
        return bereitschaftszeitraumApi.bulk(
          bulk as { create: (IDatenBZ & { clientRequestId: string })[]; update: IDatenBZ[]; delete: string[] },
          period.monat,
          period.jahr,
        );
      case 'BE':
        return bereitschaftseinsatzApi.bulk(
          bulk as { create: (IDatenBE & { clientRequestId: string })[]; update: IDatenBE[]; delete: string[] },
          period.monat,
          period.jahr,
        );
      case 'EWT':
        return ewtApi.bulk(
          bulk as { create: (IDatenEWT & { clientRequestId: string })[]; update: IDatenEWT[]; delete: string[] },
          period.monat,
          period.jahr,
        );
      case 'N':
        return nebengeldApi.bulk(
          bulk as { create: (IDatenN & { clientRequestId: string })[]; update: IDatenN[]; delete: string[] },
          period.monat,
          period.jahr,
        );
    }
  };

  if (sortedPeriods.length === 0) {
    const result = await callBulk({ monat, jahr }, true);
    combined.created.push(...result.created);
    combined.updated.push(...result.updated);
    combined.deleted.push(...result.deleted);
    if (result.createdReferences) combined.createdReferences?.push(...result.createdReferences);
    combined.errors.push(...result.errors);
    return combined;
  }

  let deleteSent = false;
  for (const period of sortedPeriods) {
    const result = await callBulk(period, !deleteSent);
    deleteSent = deleteSent || changes.delete.length > 0;
    combined.created.push(...result.created);
    combined.updated.push(...result.updated);
    combined.deleted.push(...result.deleted);
    if (result.createdReferences) combined.createdReferences?.push(...result.createdReferences);
    combined.errors.push(...result.errors);
  }

  return combined;
}
