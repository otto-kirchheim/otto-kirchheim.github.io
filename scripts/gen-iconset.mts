/**
 * Generator fuer `src/scss/iconset.<satz>.css` aus `src/ts/components/iconRegistry.ts`.
 *
 * Die erzeugte Datei ist ein CSS-Remap-Layer: sie setzt pro DB-Icon-Name das `--db-icon`
 * des Design-Systems auf den Namen im Zielsatz. Sie ist eingecheckt, aber NICHT importiert --
 * erst der Swap (siehe Runbook in `iconRegistry.ts`) aktiviert den `@import` in `db-ux.css`.
 *
 *   bun run icons:gen          schreibt die Datei
 *   bun scripts/gen-iconset.mts --check   nur pruefen (Exit 1 bei Abweichung)
 *
 * `test/iconRegistry.test.ts` nutzt `renderIconsetCss()` als Drift-Schutz.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { ICON_REGISTRY, type IconZiel } from '../src/ts/components/iconRegistry.ts';

const ZIEL_DATEI = new URL('../src/scss/iconset.material.css', import.meta.url);

/** Erzeugt den kompletten Inhalt von `iconset.material.css` (deterministisch, sortiert). */
export function renderIconsetCss(): string {
  const regeln = Object.entries(ICON_REGISTRY as Record<string, IconZiel>)
    .map(([db, ziel]) => ({ db, material: ziel.material, hinweis: ziel.hinweis }))
    .sort((a, b) => a.db.localeCompare(b.db))
    .map(({ db, material, hinweis }, index) => {
      const leer = index === 0 ? '' : '\n';
      const kommentar = hinweis ? `  /* ${hinweis} */\n` : '';
      return `${leer}${kommentar}  [data-icon="${db}"] {\n    --db-icon: "${material}";\n  }\n`;
    })
    .join('');

  return `/*
 * GENERIERT von scripts/gen-iconset.mts -- NICHT von Hand editieren.
 * Quelle: src/ts/components/iconRegistry.ts   (Neu erzeugen: bun run icons:gen)
 *
 * CSS-Remap-Layer fuer den Wechsel des Icon-Satzes auf Material Symbols. Bildet jeden in der
 * App genutzten DB-UX-Icon-Namen auf den Material-Namen ab, indem der vom Design-System
 * vorgesehene Override "--db-icon" gesetzt wird
 * ([data-icon]::before { content: var(--db-icon, attr(data-icon)) }). Erst aktiv, wenn der
 * @import in src/scss/db-ux.css einkommentiert und --db-icon-font-family in styles.scss auf
 * Material Symbols gestellt ist.
 */
@layer app {
${regeln}}
`;
}

function main(): void {
  const check = process.argv.includes('--check');
  const neu = renderIconsetCss();
  const pfad = fileURLToPath(ZIEL_DATEI);

  if (check) {
    let alt = '';
    try {
      alt = readFileSync(pfad, 'utf8');
    } catch {
      /* Datei fehlt -> zaehlt als Abweichung */
    }
    if (alt !== neu) {
      console.error('iconset.material.css ist nicht synchron mit iconRegistry.ts. `bun run icons:gen` ausfuehren.');
      process.exit(1);
    }
    console.log('iconset.material.css ist synchron.');
    return;
  }

  writeFileSync(pfad, neu);
  console.log(`geschrieben: ${pfad}`);
}

if (import.meta.main) main();
