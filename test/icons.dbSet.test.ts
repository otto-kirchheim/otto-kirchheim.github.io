import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { DB_ICON, EIGENE_ICONS } from '@/components/dbIcons';

/**
 * Ein Icon-Name, den der DB-Satz nicht kennt, faellt nicht auf: die Icon-Schrift rendert
 * dann einfach nichts (oder den Ersatzpunkt). Genau das ist beim Umstieg passiert -- die
 * dynamischen `data-icon={...}`-Ausdruecke trugen noch Material-Namen. Dieser Test liest die
 * echten Icon-Dateien und prueft jeden im Quellcode verwendeten Namen dagegen.
 */
function sammleDateien(pfad: string, endungen: string[], treffer: string[] = []): string[] {
  for (const eintrag of readdirSync(pfad)) {
    const voll = join(pfad, eintrag);
    if (statSync(voll).isDirectory()) sammleDateien(voll, endungen, treffer);
    else if (endungen.some(e => eintrag.endsWith(e))) treffer.push(voll);
  }
  return treffer;
}

const ICON_SATZ = new Set(
  sammleDateien('node_modules/@db-ux/db-theme-icons/build/assets', ['_24.svg']).map(p => {
    const name = p.split('/').pop() as string;
    return name.slice(0, -'_24.svg'.length);
  }),
);

describe('DB-Icon-Namen', () => {
  it('kennt den Icon-Satz aus dem installierten Paket', () => {
    expect(ICON_SATZ.size).toBeGreaterThan(300);
    expect(ICON_SATZ.has('bin')).toBe(true);
  });

  it('bildet jeden Material-Namen auf ein existierendes DB-Icon ab', () => {
    const fehlend = Object.entries(DB_ICON).filter(([, db]) => !ICON_SATZ.has(db));
    expect(fehlend).toEqual([]);
  });

  it('verwendet im Quellcode nur Namen, die es wirklich gibt', () => {
    // `none` ist kein Motiv, sondern die DB-eigene Abschaltung des Standard-Logos
    // (`DBBrand` setzt sie selbst, wenn ein eigenes Bild uebergeben wird).
    const eigen = new Set<string>([...EIGENE_ICONS, 'none']);
    const unbekannt = new Set<string>();

    for (const datei of [...sammleDateien('src', ['.ts', '.tsx', '.html'])]) {
      const inhalt = readFileSync(datei, 'utf8');
      for (const treffer of inhalt.matchAll(/data-icon="([a-z_]+)"/g)) {
        const name = treffer[1] as string;
        if (!ICON_SATZ.has(name) && !eigen.has(name)) unbekannt.add(`${datei}: ${name}`);
      }
      // Ternaere Ausdruecke: `data-icon={x ? 'a' : 'b'}`
      for (const treffer of inhalt.matchAll(/data-icon=\{[^}]*?'([a-z_]+)'\s*:\s*'([a-z_]+)'/g)) {
        for (const name of [treffer[1] as string, treffer[2] as string]) {
          if (!ICON_SATZ.has(name) && !eigen.has(name)) unbekannt.add(`${datei}: ${name}`);
        }
      }
    }

    expect([...unbekannt]).toEqual([]);
  });
});
