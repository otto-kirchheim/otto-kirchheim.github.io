import type { Schriftart } from '@otto-kirchheim/nebengeld-shared';
import { SCHRIFTARTEN } from './datenKatalog';
import type { VorlageFontFamilie } from './vorlageFonts';

export const SCHNITTE = [
  { key: 'normal', label: 'Normal' },
  { key: 'fett', label: 'Fett' },
  { key: 'kursiv', label: 'Kursiv' },
  { key: 'fettKursiv', label: 'Fett+Kursiv' },
] as const;
export type Schnitt = (typeof SCHNITTE)[number]['key'];
export type Abweichung = 'fett' | 'kursiv' | 'fettKursiv';
export const ABWEICHUNGEN: Abweichung[] = ['fett', 'kursiv', 'fettKursiv'];

export function schnittLabel(schnitt: Schnitt): string {
  return SCHNITTE.find(s => s.key === schnitt)!.label;
}

/** Familie eines Schnitts: `schriftart` ist eine Familie für alle vier oder ein Objekt je Schnitt
 *  (fehlt ein Schnitt, gilt `normal`, sonst `'helvetica'`). Spiegelt `build.ts`. */
export function familieFuerSchnitt(schriftart: Schriftart | undefined, schnitt: Schnitt): string {
  if (!schriftart) return 'helvetica';
  if (typeof schriftart === 'string') return schriftart;
  return schriftart[schnitt] ?? schriftart.normal ?? 'helvetica';
}

/** Familien-Label für einen Auswahlwert (Standard-14 oder `vorlage:<Name>`). */
export function familieLabel(wert: string): string {
  return SCHRIFTARTEN.find(f => f.wert === wert)?.label ?? `${wert.replace(/^vorlage:/, '')} (Vorlage)`;
}

/** Knappe Beschreibung der aktuellen Schriftwahl für den Öffnen-Button -- z.B. `"Times +1"`. */
export function schriftKurz(value: Schriftart | undefined): string {
  const basis = familieFuerSchnitt(value, 'normal');
  if (!value || typeof value === 'string') return familieLabel(basis);
  const abweichungen = ABWEICHUNGEN.filter(k => value[k] !== undefined && value[k] !== basis).length;
  return abweichungen > 0 ? `${familieLabel(basis)} +${abweichungen}` : familieLabel(basis);
}

/** Kurzliste der Schnitte, die eine eingebettete Familie mitbringt -- z.B. `"normal/fett"`. */
export function schnitteText(familie: VorlageFontFamilie): string {
  return (
    SCHNITTE.filter(s => familie.schnitte[s.key])
      .map(s => s.label.toLowerCase())
      .join('/') || '—'
  );
}

/**
 * Schnitte, deren aufgelöste Familie eine eingebettete `vorlage:`-Schrift ist, die genau diesen
 * Schnitt NICHT mitbringt -- dort setzt der Renderer Helvetica im passenden Schnitt. Grundlage für
 * die Warnung im Editor.
 */
export function fehlendeVorlagenSchnitte(
  schriftart: Schriftart | undefined,
  vorlageFonts: VorlageFontFamilie[],
): Schnitt[] {
  return SCHNITTE.filter(s => {
    const familie = familieFuerSchnitt(schriftart, s.key);
    if (!familie.startsWith('vorlage:')) return false;
    const font = vorlageFonts.find(f => f.id === familie);
    return font !== undefined && !font.schnitte[s.key];
  }).map(s => s.key);
}

/** Grundfamilie + Schnitt-Abweichungen zurück auf die knappste `Schriftart`: ein String (bzw.
 *  `undefined` bei Helvetica), wenn keine echte Abweichung bleibt, sonst das Objekt. */
export function verdichteSchriftart(basis: string, abw: Partial<Record<Abweichung, string>>): Schriftart | undefined {
  const echte = ABWEICHUNGEN.filter(k => abw[k] !== undefined && abw[k] !== basis);
  if (echte.length === 0) return basis === 'helvetica' ? undefined : basis;
  const objekt: Extract<Schriftart, object> = { normal: basis };
  for (const k of echte) objekt[k] = abw[k];
  return objekt;
}
