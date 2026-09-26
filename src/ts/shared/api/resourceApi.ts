import type { FeatureResourceApi } from '@/shared/lib/feature';
import { type BulkRequest, type BulkResponse, type ResourceName, loadResourceYear, smartSync } from './apiFetchHelper';

/** Endpunkte einer Ressource (`loadYear` und `bulk`), gebaut von `createResourceEndpoints`. */
export interface ResourceEndpoints<TRow, TBackend> {
  loadYear(year: number): Promise<{ data: TRow[]; updatedAt: string | null }>;
  bulk(
    items: { create: (TRow & { clientRequestId: string })[]; update: TRow[]; delete: string[] },
    monat: number,
    jahr: number,
  ): Promise<BulkResponse<TBackend>>;
}

/**
 * Baut den Backend-Adapter einer Ressource fuer `meta.resources[].api` aus Mapper und API-Objekt.
 *
 * @typeParam TRow - Zeilentyp im Frontend.
 * @typeParam TBackend - Dokumenttyp im Backend.
 * @param fromBackend - Mapper Backend-Dokument -> Frontend-Zeile.
 * @param endpoints - Liefert das API-Objekt der Ressource; erst beim Aufruf aufgeloest (spaete Bindung, Mocks in Tests).
 * @returns Adapter mit `fromBackend`, `loadYear` und `bulk`.
 */
export function createResourceApi<TRow, TBackend>(
  fromBackend: (doc: TBackend) => TRow,
  endpoints: () => ResourceEndpoints<TRow, TBackend>,
): FeatureResourceApi {
  return {
    fromBackend: doc => fromBackend(doc as TBackend),
    loadYear: year => endpoints().loadYear(year),
    bulk: (items, monat, jahr) =>
      endpoints().bulk(items as Parameters<ResourceEndpoints<TRow, TBackend>['bulk']>[0], monat, jahr),
  };
}

/**
 * Baut die Endpunkte einer Ressource aus API-Pfad und Mappern: Jahr laden und gebuendelt senden (neue Zeilen ohne `_id`,
 * mit `clientRequestId`).
 *
 * @typeParam TRow - Zeilentyp im Frontend.
 * @typeParam TBackend - Dokumenttyp im Backend.
 * @param resource - API-Pfadsegment (`<resource>/<jahr>`, `<resource>/bulk`).
 * @param fromBackend - Mapper Backend-Dokument -> Frontend-Zeile.
 * @param toBackend - Mapper Frontend-Zeile -> Backend-Dokument; `monat`/`jahr` sind Fallbacks bei ungueltigem Datum.
 * @returns `loadYear` und `bulk` der Ressource.
 */
export function createResourceEndpoints<TRow extends { _id?: string }, TBackend extends { updatedAt?: string }>(
  resource: ResourceName,
  fromBackend: (doc: TBackend) => TRow,
  toBackend: (item: TRow, monat: number, jahr: number) => object,
): ResourceEndpoints<TRow, TBackend> {
  return {
    async loadYear(year) {
      const result = await loadResourceYear<TBackend, TRow>(resource, year, fromBackend);
      return { data: result.data, updatedAt: result.maxUpdatedAt };
    },
    async bulk(items, monat, jahr) {
      const bulk: BulkRequest = {
        create: items.create.map(item => {
          const data = toBackend(item, monat, jahr);
          delete (data as Record<string, unknown>)._id;
          return { ...data, clientRequestId: item.clientRequestId };
        }),
        update: items.update.map(item => ({ ...toBackend(item, monat, jahr), _id: item._id! })),
        delete: items.delete,
      };
      return smartSync<TBackend>(resource, bulk);
    },
  };
}
