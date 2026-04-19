import type { TResourceKey } from '../../interfaces';
import type { TStorageData } from '../storage/Storage';

export type ResourceKind = Exclude<TResourceKey, 'settings'>;

export const RESOURCE_STORAGE_MAP: Record<ResourceKind, TStorageData> = {
  BZ: 'dataBZ',
  BE: 'dataBE',
  EWT: 'dataE',
  N: 'dataN',
};

export const RESOURCE_TABLE_ID_MAP: Record<ResourceKind, string> = {
  BZ: 'tableBZ',
  BE: 'tableBE',
  EWT: 'tableE',
  N: 'tableN',
};
