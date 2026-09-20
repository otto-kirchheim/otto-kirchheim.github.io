import type { Daten } from '@otto-kirchheim/nebengeld-shared';

/**
 * Liest einen punktgetrennten Pfad aus verschachtelten Daten.
 *
 * @param daten - Wurzelobjekt.
 * @param pfad - Punktgetrennter Pfad, z.B. `VorgabenU.Pers.Name`.
 * @returns Der Wert, `undefined` wenn ein Teilpfad fehlt.
 */
export function get(daten: Daten, pfad: string): unknown {
  return pfad.split('.').reduce<unknown>((wert, teil) => {
    if (wert === null || wert === undefined) return undefined;
    return (wert as Record<string, unknown>)[teil];
  }, daten);
}
