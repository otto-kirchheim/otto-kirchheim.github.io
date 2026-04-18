import type { IDatenBE, IDatenBZ, IDatenEWT, IDatenN } from '../../interfaces';
import { getMonatFromBE, getMonatFromBZ, getMonatFromEWT, getMonatFromN, normalizeResourceRows } from '../../utilities';
import type { TStorageData } from '../../utilities/Storage';

const MONTH_AWARE_STORAGE_NAMES: TStorageData[] = ['dataBZ', 'dataBE', 'dataE', 'dataN'];

export function isSessionErrorMessage(message: string): boolean {
  return /session ungültig|abgemeldet|token|erneuerung/i.test(message);
}

export function normalizeRows<T>(rows: unknown): T[] {
  return normalizeResourceRows<T>(rows);
}

function hasStringId(value: unknown): boolean {
  return typeof value === 'object' && value !== null && typeof (value as { _id?: unknown })._id === 'string';
}

function serializeRowWithoutMeta(row: unknown): string {
  if (row === null || row === undefined) return JSON.stringify(row);
  if (typeof row !== 'object') return JSON.stringify(row);
  if (Array.isArray(row)) return `[${row.map(item => serializeRowWithoutMeta(item)).join(',')}]`;

  const normalized = Object.entries(row as Record<string, unknown>)
    .filter(([key, value]) => !['_id', 'updatedAt', 'createdAt', '__v'].includes(key) && value !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));

  return `{${normalized.map(([key, value]) => `${JSON.stringify(key)}:${serializeRowWithoutMeta(value)}`).join(',')}}`;
}

export function shouldRepairMissingIds(storageName: TStorageData, localData: unknown, serverData: unknown): boolean {
  if (!MONTH_AWARE_STORAGE_NAMES.includes(storageName)) return false;

  const localRows = normalizeRows<Record<string, unknown>>(localData);
  const serverRows = normalizeRows<Record<string, unknown>>(serverData);

  if (localRows.length === 0 || localRows.length !== serverRows.length) return false;
  if (!localRows.some(row => !hasStringId(row))) return false;
  if (!serverRows.every(row => hasStringId(row))) return false;

  const localSignatures = localRows.map(serializeRowWithoutMeta).sort();
  const serverSignatures = serverRows.map(serializeRowWithoutMeta).sort();

  return localSignatures.every((signature, index) => signature === serverSignatures[index]);
}

export function countByMonth(rows: unknown, storageName: TStorageData): Map<number, number> {
  const normalized = normalizeRows(rows);
  const monthCount = new Map<number, number>();

  normalized.forEach(row => {
    if (!row || typeof row !== 'object') return;
    let m = -1;
    if (storageName === 'dataBZ') m = getMonatFromBZ(row as IDatenBZ);
    else if (storageName === 'dataBE') m = getMonatFromBE(row as IDatenBE);
    else if (storageName === 'dataE') m = getMonatFromEWT(row as IDatenEWT);
    else if (storageName === 'dataN') m = getMonatFromN(row as IDatenN);

    const bucket = m > 0 ? m : 0;
    monthCount.set(bucket, (monthCount.get(bucket) ?? 0) + 1);
  });

  return monthCount;
}

export function rowMatchesMonth(storageName: TStorageData, row: unknown, month: number): boolean {
  if (storageName === 'dataBZ' && row) {
    const m = getMonatFromBZ(row as IDatenBZ);
    return month === 0 ? m <= 0 : m === month;
  }

  if (storageName === 'dataBE' && row) {
    const m = getMonatFromBE(row as IDatenBE);
    return month === 0 ? m <= 0 : m === month;
  }

  if (storageName === 'dataE' && row) {
    const m = getMonatFromEWT(row as IDatenEWT);
    return month === 0 ? m <= 0 : m === month;
  }

  if (storageName === 'dataN' && row) {
    const m = getMonatFromN(row as IDatenN);
    return month === 0 ? m <= 0 : m === month;
  }

  return false;
}

export { MONTH_AWARE_STORAGE_NAMES };
