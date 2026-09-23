import type { INebengeld } from '@otto-kirchheim/nebengeld-shared';
import type { FeaturePdfContext } from '@/shared/lib/feature';
import { filterByMonat, getMonatFromN } from '@/shared/lib/date/getMonatFromItem';
import tableToArray from '@/shared/lib/ressource/tableToArray';
import { tableIdOf } from '@/shared/lib/ressource/resourceConfig';
import type { IPdfBase } from '@/infrastructure/pdf/pdfDaten';
import type { IDatenN } from '@/types';

// `Arbeitszeit` wird erst durch `ezAbgeleiteteWerte()` (`features/Neben/utils/pdfDaten.ts`) berechnet, deshalb
// optional statt vom Typsystem erzwungen.
export type IPdfNebengeld = Required<Omit<INebengeld, '_id' | 'EWT'>> & { Arbeitszeit?: string };

export interface INebengeldPdfBody extends IPdfBase {
  Daten: {
    N: IPdfNebengeld[];
  };
}

export interface EzAbgeleiteteWerte {
  /** `"Beginn-Ende"`, z.B. `"07:00-15:45"` -- eine Spalte hat keine `Feld.quellen`/`trenner`-Verkettung. */
  Arbeitszeit: string;
}

/**
 * Arbeitszeit einer Nebengeld-Zeile als `"Beginn-Ende"`. Vorberechnet, weil `Spalte` (anders als `Feld`)
 * keine `quellen`/`trenner`-Verkettung kennt.
 *
 * @param zeile - Nebengeld-Zeile mit `Beginn` und `Ende`.
 * @returns `Arbeitszeit` als `"Beginn-Ende"`.
 */
export function ezAbgeleiteteWerte(zeile: Pick<IPdfNebengeld, 'Beginn' | 'Ende'>): EzAbgeleiteteWerte {
  return { Arbeitszeit: `${zeile.Beginn}-${zeile.Ende}` };
}

/**
 * Baut die PDF-Daten der Erschwerniszulagen (Neben/EZ) aus der Tabelle des Exportmonats inklusive vorberechneter `Arbeitszeit`.
 *
 * @param context - Exportmonat u. a. (`FeaturePdfContext`).
 * @returns `Daten.N` in der Form der Vorlagen-Pipeline.
 */
export function baueEzPdfDaten({ monat }: FeaturePdfContext): { Daten: INebengeldPdfBody['Daten'] } {
  const nRaw = filterByMonat(tableToArray<IDatenN>(tableIdOf('N')), monat, getMonatFromN);
  return {
    Daten: {
      N: nRaw.map(n => {
        const basis = {
          Tag: n.Tag,
          Beginn: n.Beginn,
          Ende: n.Ende,
          Auftragsnummer: n.Auftragsnummer,
          Zulagen: (n.Zulagen ?? []).map(z => ({ Typ: z.Typ, Wert: z.Wert })),
        };
        // Vorberechnete Arbeitszeit-Anzeige steht mit im Zeilenobjekt (Datenpfad Daten.N[].Arbeitszeit).
        return { ...basis, ...ezAbgeleiteteWerte(basis) };
      }),
    },
  };
}
