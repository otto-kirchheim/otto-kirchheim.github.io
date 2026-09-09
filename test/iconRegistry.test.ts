import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { ICON_REGISTRY, NICHT_REMAPPT } from '@/components/iconRegistry';
import { renderIconsetCss } from '../scripts/gen-iconset.mts';

/**
 * Die Icon-Registry ist die Umschalt-Grundlage fuer einen freien Icon-Satz (siehe
 * `iconRegistry.ts`). Zwei Dinge muessen stimmen, sonst greift der Remap beim Swap nicht:
 *   1. Jeder Icon-Name, der im `src/` in einem `data-icon` landet, hat einen Registry-Eintrag.
 *   2. Die generierte `iconset.material.css` ist deckungsgleich mit der Registry.
 */

function sammleDateien(pfad: string, endungen: string[], treffer: string[] = []): string[] {
  for (const eintrag of readdirSync(pfad)) {
    const voll = join(pfad, eintrag);
    if (statSync(voll).isDirectory()) sammleDateien(voll, endungen, treffer);
    else if (endungen.some(e => eintrag.endsWith(e))) treffer.push(voll);
  }
  return treffer;
}

const ERLAUBT = new Set<string>([...Object.keys(ICON_REGISTRY), ...NICHT_REMAPPT]);

/**
 * Icon-Namen aus den JS-Abbildungstabellen, die per `element.dataset.icon = …` gesetzt werden
 * und deshalb von den `data-icon`-Regexen nicht erfasst sind (`autoSaveIndicator.ts`,
 * `CustomSnackbar.ts`). Hier explizit, damit ihr Entfernen aus der Registry auffaellt.
 */
const JS_TABELLEN_ICONS = [
  'cloud',
  'cloud_upload',
  'check_circle',
  'exclamation_mark_circle',
  'exclamation_mark_triangle',
  'information_circle',
  'question_mark_circle',
  'wifi_disabled',
];

describe('Icon-Registry', () => {
  it('deckt jeden im Quellcode genutzten data-icon-Namen ab', () => {
    const unbekannt = new Set<string>();

    for (const datei of sammleDateien('src', ['.ts', '.tsx', '.html'])) {
      const inhalt = readFileSync(datei, 'utf8');
      for (const treffer of inhalt.matchAll(/data-icon="([a-z_]+)"/g)) {
        if (!ERLAUBT.has(treffer[1] as string)) unbekannt.add(`${datei}: ${treffer[1]}`);
      }
      // Ternaere Ausdruecke: `data-icon={x ? 'a' : 'b'}`
      for (const treffer of inhalt.matchAll(/data-icon=\{[^}]*?'([a-z_]+)'\s*:\s*'([a-z_]+)'/g)) {
        for (const name of [treffer[1] as string, treffer[2] as string]) {
          if (!ERLAUBT.has(name)) unbekannt.add(`${datei}: ${name}`);
        }
      }
    }

    expect([...unbekannt]).toEqual([]);
  });

  it('kennt die Icon-Namen aus den JS-Abbildungstabellen', () => {
    const fehlend = JS_TABELLEN_ICONS.filter(name => !(name in ICON_REGISTRY));
    expect(fehlend).toEqual([]);
  });

  it('hat fuer jeden Eintrag ein nicht-leeres Material-Ziel ohne Leerzeichen', () => {
    const kaputt = Object.entries(ICON_REGISTRY).filter(
      ([, ziel]) => !ziel.material || /\s/.test(ziel.material),
    );
    expect(kaputt).toEqual([]);
  });

  it('generiert iconset.material.css deckungsgleich (Drift-Schutz)', () => {
    const eingecheckt = readFileSync('src/scss/iconset.material.css', 'utf8');
    expect(eingecheckt).toBe(renderIconsetCss());
  });
});
