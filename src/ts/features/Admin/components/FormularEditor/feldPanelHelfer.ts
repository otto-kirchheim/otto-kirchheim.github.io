import type { Feld } from '@otto-kirchheim/nebengeld-shared';
import type { Armed } from './feldPanelTypen';

/**
 * Zwei `Armed`-Markierungen sind gleich, wenn sie Bereich und bereichsspezifische Kennung
 * (Feld-Key bzw. Tabelle[+Index]) teilen.
 *
 * @param a - Aktuelle Markierung oder `null` (nichts scharf geschaltet).
 * @param b - Markierung, mit der verglichen wird.
 * @returns `true` bei gleicher Markierung; bei `a === null` immer `false`. Bei `signaturBild` und `sonderzeile` genügt
 *   gleicher Bereich (Tabelle/Index von `sonderzeile` werden nicht verglichen).
 */
export function istGleich(a: Armed | null, b: Armed): boolean {
  if (!a || a.bereich !== b.bereich) return false;
  if (a.bereich === 'feld') return a.key === (b as { key: string }).key;
  if (a.bereich === 'spalte')
    return a.tabelle === (b as { tabelle: string }).tabelle && a.index === (b as { index: number }).index;
  if (a.bereich === 'tabelle' || a.bereich === 'letzteZeile') return a.tabelle === (b as { tabelle: string }).tabelle;
  return true;
}

/**
 * Nächster freier Feld-Key ab `basis`: `basis` selbst, sonst `basis2`, `basis3`, ...
 *
 * @param felder - Bereits vergebene Felder der Seite, nach Key.
 * @param basis - Gewünschter Key.
 * @returns Ein in `felder` noch nicht vorhandener Key.
 */
export function naechsterFreierSchluessel(felder: Record<string, Feld>, basis: string): string {
  let key = basis;
  for (let i = 2; felder[key]; i++) key = `${basis}${i}`;
  return key;
}
