import type { IEntgeltausgleich } from '@otto-kirchheim/nebengeld-shared';
import type { FeaturePdfContext } from '@/shared/lib/feature';
import { filterByMonat, getMonatFromEA } from '@/shared/lib/date/getMonatFromItem';
import tableToArray from '@/infrastructure/data/tableToArray';
import { tableIdOf } from '@/infrastructure/data/resourceConfig';
import type { IPdfBase } from '@/infrastructure/pdf/pdfDaten';
import type { IDatenEA } from '@/types';

export type IPdfEA = Required<Omit<IEntgeltausgleich, '_id' | 'EWT'>>;

export interface IEntgeltausgleichPdfBody extends IPdfBase {
  Daten: {
    EA: IPdfEA[];
  };
}

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
