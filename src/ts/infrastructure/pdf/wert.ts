import { FORMAT, OPS, get } from '@otto-kirchheim/nebengeld-shared';
import type { Daten, Feld, Zeile } from '@otto-kirchheim/nebengeld-shared';

export interface Kontext {
  $seite: Zeile[];
  $bisher: Zeile[];
}

/** Löst ein Feld gegen die Nutzdaten (Direktwert oder Berechnet-Aggregation) auf und formatiert es. */
export function wert(f: Feld, key: string, daten: Daten, kontext: Kontext): string {
  let roh: unknown;

  if (f.berechnet) {
    const q = f.berechnet.ueber;
    const rows = q.startsWith('$') ? kontext[q as keyof Kontext] : (get(daten, q) as Zeile[] | undefined);
    roh = OPS[f.berechnet.op](rows ?? [], f.berechnet.feld);
  } else {
    roh = get(daten, key);
  }

  if (roh === null || roh === undefined) return '';
  return f.format ? FORMAT[f.format](roh) : String(roh);
}
