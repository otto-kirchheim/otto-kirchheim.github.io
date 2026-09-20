import type { FeatureResourceApi } from '@/core/hooks';
import type { BulkResponse } from './apiFetchHelper';

/** Erwartete Form der Ressourcen-API in `dataApi` (`loadYear` und `bulk`). */
interface ResourceEndpoints<TRow, TBackend> {
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
