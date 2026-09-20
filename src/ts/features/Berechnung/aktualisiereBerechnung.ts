import type { IVorgabenBerechnung } from '@/types';
import { default as normalizeResourceRows } from '@/infrastructure/data/normalizeResourceRows';
import { type ResourceKind, resourceDefs } from '@/infrastructure/data/resourceConfig';
import Storage from '@/infrastructure/storage/Storage';
import type { TStorageData } from '@/infrastructure/storage/Storage';
import generateTableBerechnung from './generateTableBerechnung';
import { ladeBerechnungsTeile } from './ladeBerechnungsTeile';

/**
 * Berechnet für alle zwölf Monate die Summen der Features (Aggregation im Slot `berechnung` jedes Features), speichert sie unter
 * `datenBerechnung` und rendert die Berechnungstabelle neu. Wartet auf das Laden der Berechnungs-Slots der Features.
 *
 * @param daten - Zu verwendende Zeilen je Ressource; ohne Angabe werden sie aus dem Storage gelesen.
 * @returns Berechnung je Monat (1-12).
 */
export default async function aktualisiereBerechnung(
  daten?: Partial<Record<ResourceKind, unknown>>,
): Promise<IVorgabenBerechnung> {
  const teile = await ladeBerechnungsTeile();

  const rows: Record<string, unknown[]> = {};
  for (const resource of resourceDefs()) {
    const quelle = daten
      ? daten[resource.key]
      : Storage.get<unknown>(resource.storageKey as TStorageData, { default: [] });
    rows[resource.key] = normalizeResourceRows<unknown>(quelle);
  }

  const Berechnung: IVorgabenBerechnung = Storage.get<IVorgabenBerechnung>('datenBerechnung', {
    check: true,
    default: {} as IVorgabenBerechnung,
  });

  for (let Monat = 1; Monat <= 12; Monat++) {
    Berechnung[Monat as keyof IVorgabenBerechnung] = Object.fromEntries(
      teile.map(({ part }) => [part.bucketKey, part.aggregate(rows, Monat)]),
    ) as unknown as IVorgabenBerechnung[keyof IVorgabenBerechnung];
  }

  Storage.set<IVorgabenBerechnung>('datenBerechnung', Berechnung);
  await generateTableBerechnung(Berechnung);

  return Berechnung;
}
