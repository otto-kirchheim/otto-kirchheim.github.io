import type { FeaturePdfContext } from '@/core/hooks';
import { filterByMonat, getMonatFromEA } from '@/infrastructure/date/getMonatFromItem';
import tableToArray from '@/infrastructure/data/tableToArray';
import { tableIdOf } from '@/infrastructure/data/resourceConfig';
import type { IEntgeltausgleichPdfBody } from '@/infrastructure/pdf/pdfDaten';
import type { IDatenEA } from '@/types';

/**
 * Baut die PDF-Daten des Entgeltausgleichs aus der EA-Tabelle des Exportmonats (nur Feld-Mapping, keine Ableitung).
 *
 * @param context - Exportmonat u. a. (`FeaturePdfContext`).
 * @returns `Daten.EA` in der Form der Vorlagen-Pipeline (`datenKatalog.ts`/`wert.ts`).
 */
export function baueEaPdfDaten({ monat }: FeaturePdfContext): { Daten: IEntgeltausgleichPdfBody['Daten'] } {
  const eaRaw = filterByMonat(tableToArray<IDatenEA>(tableIdOf('EA')), monat, getMonatFromEA);
  return {
    Daten: {
      EA: eaRaw.map(ea => ({
        Tag: ea.Tag,
        Dauer: ea.Dauer,
        Taetigkeit: ea.Taetigkeit,
        Entgeltgruppe: ea.Entgeltgruppe,
      })),
    },
  };
}
