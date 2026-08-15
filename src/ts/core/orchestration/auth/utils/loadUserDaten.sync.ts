import type { IDatenBE, IDatenBZ, IDatenEA, IDatenEWT, IDatenN, UserDatenServer } from '@/types';
import { default as Storage } from '@/infrastructure/storage/Storage';
import dayjs from '@/infrastructure/date/configDayjs';
import type { LoadedYearData } from '@/infrastructure/api/apiService';
import type { TStorageData } from '@/infrastructure/storage/Storage';
import {
  MONTH_AWARE_STORAGE_NAMES,
  countByMonth,
  normalizeRows,
  shouldRepairMissingIds,
} from './loadUserDaten.helpers';
import { hasPendingLocalChanges } from '@/infrastructure/data/metaFields';

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
  EA: LoadedYearData['EA'];
  serverTimestamps: LoadedYearData['timestamps'];
  isJahreswechsel?: boolean;
}

interface SyncLoadedYearResourcesResult {
  vorgabenU: LoadedYearData['vorgabenU'];
  BZ: IDatenBZ[];
  BE: IDatenBE[];
  EWT: IDatenEWT[];
  N: IDatenN[];
  EA: IDatenEA[];
  dataServer: Partial<UserDatenServer>;
  vorhanden: UnterschiedNachMonat[];
}

export function syncLoadedYearResources({
  vorgabenU,
  BZ,
  BE,
  EWT,
  N,
  EA,
  serverTimestamps,
  isJahreswechsel,
}: SyncLoadedYearResourcesParams): SyncLoadedYearResourcesResult {
  const vorhanden: UnterschiedNachMonat[] = [];
  // Immer frisch starten — Konflikte werden je Load aus aktuellen Server+Local-Daten berechnet.
  // Altdaten aus einem vorigen Jahres-Load dürfen nicht in einen anderen Load durchsickern (Bug 2).
  const dataServer: Partial<UserDatenServer> = {};

  const syncResource = <T>(
    storageName: TStorageData,
    serverData: T,
    serverTimestamp: number,
    beschreibung: string,
  ): T => {
    // Bei Jahreswechsel: lokale Daten gehören zum alten Jahr → Server direkt übernehmen
    if (isJahreswechsel) {
      Storage.setWithTimestamp(storageName, serverData, serverTimestamp);
      return serverData;
    }

    const localTs = Storage.getTimestamp(storageName);
    const localData = Storage.check(storageName)
      ? Storage.get<unknown>(storageName, { default: serverData })
      : undefined;

    if (localTs === 0 || serverTimestamp > localTs || shouldRepairMissingIds(storageName, localData, serverData)) {
      // Ungesyncte lokale Änderungen (__localState, __errorMessage) nicht überschreiben —
      // Conflict-Review greift über countByMonth, das pending-deleted Rows exkludiert.
      const localRows = localData !== undefined ? normalizeRows<unknown>(localData) : [];
      if (!hasPendingLocalChanges(localRows)) {
        Storage.setWithTimestamp(storageName, serverData, serverTimestamp);
        return serverData;
      }
    }

    if (localData !== undefined && MONTH_AWARE_STORAGE_NAMES.includes(storageName)) {
      const localRows = normalizeRows<unknown>(localData);
      const serverRows = normalizeRows<unknown>(serverData);
      if (localRows.length !== serverRows.length) {
        const vorhandenBefore = vorhanden.length;
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

        // dataServer nur setzen wenn die Zählung echte Unterschiede ergab — ein reiner
        // Längenunterschied durch Pending-New-Rows (ohne _id) ist kein Konflikt.
        if (vorhanden.length > vorhandenBefore) {
          if (storageName === 'dataBZ') dataServer.BZ = serverData as UserDatenServer['BZ'];
          if (storageName === 'dataBE') dataServer.BE = serverData as UserDatenServer['BE'];
          if (storageName === 'dataE') dataServer.EWT = serverData as UserDatenServer['EWT'];
          if (storageName === 'dataN') dataServer.N = serverData as UserDatenServer['N'];
          if (storageName === 'dataEA') dataServer.EA = serverData as UserDatenServer['EA'];
        }
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

  const syncedEA = syncResource(
    'dataEA',
    EA,
    serverTimestamps.dataEA ? dayjs(serverTimestamps.dataEA).valueOf() : 0,
    'Entgeltausgleich',
  );

  return {
    vorgabenU: syncedVorgabenU,
    BZ: normalizeRows<IDatenBZ>(syncedBZ),
    BE: normalizeRows<IDatenBE>(syncedBE),
    EWT: normalizeRows<IDatenEWT>(syncedEWT),
    N: normalizeRows<IDatenN>(syncedN),
    EA: normalizeRows<IDatenEA>(syncedEA),
    dataServer,
    vorhanden,
  };
}
