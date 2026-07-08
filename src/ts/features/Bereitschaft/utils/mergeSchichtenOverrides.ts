import type { IPerWeekdaySchicht, IVorgabenUvorgabenB } from '@/types';

type Overrides = IVorgabenUvorgabenB['schichtenOverrides'];
type SchichtKey = 'frueh' | 'spaet' | 'nacht' | 'sonder';

/**
 * Merged zwei `schichtenOverrides`-Objekte feldweise je Schicht; `runtime` gewinnt.
 * `default` und `overrides` werden innerhalb einer Schicht zusammengeführt.
 */
export default function mergeSchichtenOverrides(base: Overrides = {}, runtime: Overrides = {}): Overrides {
  const mergeOne = (key: SchichtKey): Partial<IPerWeekdaySchicht> | undefined => {
    const baseEntry = base?.[key];
    const runtimeEntry = runtime?.[key];
    if (!baseEntry && !runtimeEntry) return undefined;

    const merged: Partial<IPerWeekdaySchicht> = { ...(baseEntry ?? {}), ...(runtimeEntry ?? {}) };

    if (baseEntry?.default || runtimeEntry?.default) {
      merged.default = {
        ...(baseEntry?.default ?? {}),
        ...(runtimeEntry?.default ?? {}),
      } as IPerWeekdaySchicht['default'];
    }

    if (baseEntry?.overrides || runtimeEntry?.overrides) {
      merged.overrides = {
        ...(baseEntry?.overrides ?? {}),
        ...(runtimeEntry?.overrides ?? {}),
      };
    }

    return merged;
  };

  return {
    frueh: mergeOne('frueh'),
    spaet: mergeOne('spaet'),
    nacht: mergeOne('nacht'),
    sonder: mergeOne('sonder'),
  };
}
