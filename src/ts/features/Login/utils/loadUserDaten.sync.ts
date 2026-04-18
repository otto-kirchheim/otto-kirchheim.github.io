import type { IDatenBE, IDatenBZ, IDatenEWT, IDatenN, UserDatenServer } from '../../../interfaces';
import { Storage } from '../../../utilities';
import dayjs from '../../../infrastructure/date/configDayjs';
import type { LoadedYearData } from '../../../infrastructure/api/apiService';
import type { TStorageData } from '../../../infrastructure/storage/Storage';
import {
  MONTH_AWARE_STORAGE_NAMES,
  countByMonth,
  normalizeRows,
  shouldRepairMissingIds,
} from './loadUserDaten.helpers';

export interface UnterschiedNachMonat {
  beschreibung: string;
  monat: number;
  lokal: number;
  server: number;
}

interface SyncLoadedYearResourcesParams {
  vorgabenU: LoadedYearData['vorgabenU'];
  BZ: LoadedYearData['BZ'];
  BE: LoadedYearData['BE'];
  EWT: LoadedYearData['EWT'];
  N: LoadedYearData['N'];
  serverTimestamps: LoadedYearData['timestamps'];
  initialDataServer?: Partial<UserDatenServer>;
}

interface SyncLoadedYearResourcesResult {
  vorgabenU: LoadedYearData['vorgabenU'];
  BZ: IDatenBZ[];
  BE: IDatenBE[];
  EWT: IDatenEWT[];
  N: IDatenN[];
  dataServer: Partial<UserDatenServer>;
  vorhanden: UnterschiedNachMonat[];
}

export function syncLoadedYearResources({
  vorgabenU,
  BZ,
  BE,
  EWT,
  N,
  serverTimestamps,
  initialDataServer,
}: SyncLoadedYearResourcesParams): SyncLoadedYearResourcesResult {
  const vorhanden: UnterschiedNachMonat[] = [];
  const dataServer: Partial<UserDatenServer> = { ...(initialDataServer ?? {}) };

  const syncResource = <T>(
    storageName: TStorageData,
    serverData: T,
    serverTimestamp: number,
    beschreibung: string,
  ): T => {
    const localTs = Storage.getTimestamp(storageName);
    const localData = Storage.check(storageName)
      ? Storage.get<unknown>(storageName, { default: serverData })
      : undefined;

    if (localTs === 0 || serverTimestamp > localTs || shouldRepairMissingIds(storageName, localData, serverData)) {
      Storage.setWithTimestamp(storageName, serverData, serverTimestamp);
      return serverData;
    }

    if (localData !== undefined && MONTH_AWARE_STORAGE_NAMES.includes(storageName)) {
      const localRows = normalizeRows<unknown>(localData);
      const serverRows = normalizeRows<unknown>(serverData);
      if (localRows.length !== serverRows.length) {
        const localByMonth = countByMonth(localData as unknown[], storageName);
        const serverByMonth = countByMonth(serverData as unknown[], storageName);
        const allMonths = new Set([...localByMonth.keys(), ...serverByMonth.keys()]);

        allMonths.forEach(m => {
          const localCount = localByMonth.get(m) ?? 0;
          const serverCount = serverByMonth.get(m) ?? 0;
          if (localCount !== serverCount) {
            vorhanden.push({
              beschreibung,
              monat: m,
              lokal: localCount,
              server: serverCount,
            });
          }
        });

        if (storageName === 'dataBZ') dataServer.BZ = serverData as UserDatenServer['BZ'];
        if (storageName === 'dataBE') dataServer.BE = serverData as UserDatenServer['BE'];
        if (storageName === 'dataE') dataServer.EWT = serverData as UserDatenServer['EWT'];
        if (storageName === 'dataN') dataServer.N = serverData as UserDatenServer['N'];
      }
    }

    return (localData as T | undefined) ?? serverData;
  };

  const syncedVorgabenU = syncResource(
    'VorgabenU',
    vorgabenU,
    serverTimestamps.VorgabenU ? dayjs(serverTimestamps.VorgabenU).valueOf() : 0,
    'Persönliche Daten',
  );

  const syncedBZ = syncResource(
    'dataBZ',
    BZ,
    serverTimestamps.dataBZ ? dayjs(serverTimestamps.dataBZ).valueOf() : 0,
    'Bereitschaftszeit',
  );

  const syncedBE = syncResource(
    'dataBE',
    BE,
    serverTimestamps.dataBE ? dayjs(serverTimestamps.dataBE).valueOf() : 0,
    'Bereitschaftseinsatz',
  );

  const syncedEWT = syncResource(
    'dataE',
    EWT,
    serverTimestamps.dataE ? dayjs(serverTimestamps.dataE).valueOf() : 0,
    'EWT',
  );
  const syncedN = syncResource(
    'dataN',
    N,
    serverTimestamps.dataN ? dayjs(serverTimestamps.dataN).valueOf() : 0,
    'Nebenbezüge',
  );

  return {
    vorgabenU: syncedVorgabenU,
    BZ: normalizeRows<IDatenBZ>(syncedBZ),
    BE: normalizeRows<IDatenBE>(syncedBE),
    EWT: normalizeRows<IDatenEWT>(syncedEWT),
    N: normalizeRows<IDatenN>(syncedN),
    dataServer,
    vorhanden,
  };
}
