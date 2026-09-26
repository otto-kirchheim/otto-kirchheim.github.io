import type { IDatenEWT, IEwtQueryOptions } from '@/types';
import { featureRegistry } from '@/shared/lib/feature';
import getEwtDaten from './getEwtDaten';

/**
 * EWT-Zeilen, denen ein Feature (`ez`, `ea`) eigene Zeilen zuordnen kann. Fehlt `ewt` im Manifest (`meta.benoetigt`),
 * ist die Liste leer, auch wenn noch Alt-Daten in `dataE` liegen: ohne das Modul gibt es keine Zuordnung mehr.
 *
 * @param featureId - Feature, das die Zuordnung braucht.
 * @param options - Abfrageoptionen wie bei `getEwtDaten`.
 * @returns Zeilen des aktiven Monats bzw. nach `options`; leer ohne `ewt`.
 */
export default function getEwtDatenFuerZuordnung(featureId: string, options?: IEwtQueryOptions): IDatenEWT[] {
  if (featureRegistry.fehlende(featureId).includes('ewt')) return [];
  return getEwtDaten(undefined, undefined, options);
}
