import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import bootstrapKlassen from './bootstrapKlassen.json';

/**
 * Ratsche fuer den Bootstrap-Rueckbau (`tasks/plan-bootstrap-rueckbau.md`): zaehlt Klassen mit Bootstrap-Namen in
 * `className` (auch `divClass`/`feldKlasse`/... der My*-Wrapper), `class: [...]` und `classList.*` unter `src/ts`. `bootstrapKlassen.json` ist die eingefrorene Liste aller
 * Klassen aus `src/scss/utilities.scss` (Stand 2026-10-03) plus `tab-pane`/`fade`/`tab-content`, damit das Zaehlen auch nach dem Loeschen der Datei greift. Die
 * Grenze sinkt mit jedem Batch und steht am Ende auf 0; neue Bootstrap-Klassen brechen den Test sofort.
 */
const GRENZE = 527;

const KLASSEN = new Set<string>(bootstrapKlassen);
const QUELLEN = [
  /\b(?:className|class|divClass|feldKlasse|spanClass|labelClass|colorClass)\s*[=:]\s*\{?\s*[`'"]([^`'"]*)[`'"]/g,
  /class:\s*\[([^\]]*)\]/g,
  /classList\.(?:add|remove|toggle|contains)\(([^)]*)\)/g,
];

/**
 * Alle `.ts`/`.tsx`-Dateien unter `dir`.
 *
 * @param dir - Startordner.
 * @returns Dateipfade.
 */
function dateien(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(eintrag => {
    if (eintrag.isDirectory()) return dateien(join(dir, eintrag.name));
    return /\.tsx?$/.test(eintrag.name) ? [join(dir, eintrag.name)] : [];
  });
}

/**
 * Anzahl Bootstrap-Klassen in einem Quelltext.
 *
 * @param quelltext - Dateiinhalt.
 * @returns Anzahl Vorkommen.
 */
function zaehle(quelltext: string): number {
  return QUELLEN.reduce(
    (summe, muster) =>
      summe +
      [...quelltext.matchAll(muster)]
        .flatMap(treffer => treffer[1].split(/[\s,]+/))
        .filter(klasse => KLASSEN.has(klasse.replace(/^['"`]|['"`]$/g, ''))).length,
    0,
  );
}

describe('Bootstrap-Rueckbau', () => {
  it(`hoechstens ${GRENZE} Bootstrap-Klassen in src/ts (Ratsche)`, () => {
    const anzahl = dateien(join(import.meta.dir, '../../src/ts')).reduce(
      (summe, datei) => summe + zaehle(readFileSync(datei, 'utf8')),
      0,
    );
    expect(anzahl).toBeLessThanOrEqual(GRENZE);
  });
});
