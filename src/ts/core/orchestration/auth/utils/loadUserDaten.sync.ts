import type { UserDatenServer } from '@/types';
import { default as Storage } from '@/infrastructure/storage/Storage';
import dayjs from '@/infrastructure/date/configDayjs';
import type { LoadedYearData } from '@/infrastructure/api/apiService';
import type { TStorageData } from '@/infrastructure/storage/Storage';
import { countByMonth, normalizeRows, shouldRepairMissingIds } from './loadUserDaten.helpers';
import { hasPendingLocalChanges } from '@/infrastructure/data/metaFields';
import { type ResourceKind, resourceByStorageKey, resourceDefs } from '@/infrastructure/data/resourceConfig';

export interface UnterschiedNachMonat {
  beschreibung: string;
  monat: number;
  lokal: number;
  server: number;
}

interface SyncLoadedYearResourcesParams {
  vorgabenU: LoadedYearData['vorgabenU'];
  /** Serverdaten je Ressource der angemeldeten Features (`meta.resources`). */
  resources: Partial<Record<ResourceKind, unknown>>;
  serverTimestamps: LoadedYearData['timestamps'];
  isJahreswechsel?: boolean;
}

interface SyncLoadedYearResourcesResult {
  vorgabenU: LoadedYearData['vorgabenU'];
  /** Abgeglichene Zeilen je Ressource der angemeldeten Features. */
  rows: Partial<Record<ResourceKind, unknown[]>>;
  dataServer: Partial<UserDatenServer>;
  vorhanden: UnterschiedNachMonat[];
}

/**
 * Gleicht die vom Server geladenen Jahresdaten je Ressource mit dem lokalen Storage ab:
 * Serverdaten ersetzen lokale, wenn diese fehlen, älter sind oder nur Ids nachzutragen sind
 * und keine ungesyncten Änderungen vorliegen; sonst bleiben die lokalen Daten. Weichen bei
 * monatsbezogenen Ressourcen die Zeilenzahlen ab, werden die Unterschiede je Monat gesammelt.
 * Bei Jahreswechsel gehören lokale Daten zum Vorjahr, dann gewinnt immer der Server.
 *
 * @param params - Serverdaten je Ressource, Server-Zeitstempel und Jahreswechsel-Flag.
 * @returns Abgeglichene Ressourcen, Serverstand der Konflikt-Ressourcen (`dataServer`) und die
 *   Unterschiede je Monat (`vorhanden`; leer = kein Konflikt).
 */
export function syncLoadedYearResources({
  vorgabenU,
  resources,
  serverTimestamps,
  isJahreswechsel,
}: SyncLoadedYearResourcesParams): SyncLoadedYearResourcesResult {
  const vorhanden: UnterschiedNachMonat[] = [];
  // Immer frisch starten: Konflikte werden je Load aus aktuellen Server- und Lokaldaten berechnet,
  // Altdaten eines vorigen Jahres-Loads dürfen nicht durchsickern.
  const dataServer: Partial<UserDatenServer> = {};

  /**
   * Gleicht eine Ressource ab und liefert die zu verwendenden Daten; sammelt Konflikte in
   * `vorhanden`/`dataServer`.
   *
   * @typeParam T - Datentyp der Ressource.
   * @param storageName - Storage-Key.
   * @param serverData - Serverdaten.
   * @param serverTimestamp - Server-Zeitstempel in ms; 0 = unbekannt.
   * @param beschreibung - Anzeigename für die Konfliktmeldung.
   * @returns Serverdaten oder lokale Daten.
   */
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

    if (localData !== undefined && resourceByStorageKey(storageName)) {
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
          const resource = resourceByStorageKey(storageName);
          if (resource) (dataServer as Record<string, unknown>)[resource.key] = serverData;
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

  const rows: Partial<Record<ResourceKind, unknown[]>> = {};
  for (const resource of resourceDefs()) {
    const timestamp = (serverTimestamps as unknown as Record<string, string | null | undefined>)[resource.storageKey];
    const synced = syncResource(
      resource.storageKey as TStorageData,
      resources[resource.key],
      timestamp ? dayjs(timestamp).valueOf() : 0,
      resource.beschreibung,
    );
    rows[resource.key] = normalizeRows<unknown>(synced);
  }

  return {
    vorgabenU: syncedVorgabenU,
    rows,
    dataServer,
    vorhanden,
  };
}
