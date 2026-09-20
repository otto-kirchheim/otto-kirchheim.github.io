/**
 * Legt ein neues Feature-Modul an: Ordner `src/ts/features/<Ordner>` (`meta.ts`, `<Ordner>Tab.tsx`, `parts/ui.tsx`,
 * `parts/help.ts`), einen Test unter `test/` und den Eintrag in `src/ts/app/features.ts` (das Manifest ist die einzige
 * Stelle, die Features kennt). Nav-Eintrag, Tab-Pane, Schnellzugriff, Tab-Auswahl in den Einstellungen und Hilfe
 * entstehen danach aus `meta`.
 *
 * Aufruf: `bun run new-feature <slug> [--ordner <Name>] [--label <Anzeigename>] [--icon <db-icon>] [--dry-run]`
 *
 * Weitere Teile (`data`, `pdf`, `berechnung`, `einstellungen`, `events`) und Ressourcen (`meta.resources`) kommen von Hand
 * dazu: `features/EA` ist die kleinste vollstaendige Vorlage. Ein neues Datenobjekt braucht zusaetzlich einen Eintrag in
 * `@otto-kirchheim/nebengeld-shared`/Backend (`TResourceKey`), Admin-Eintraege stehen im Admin-Manifest
 * (`features/Admin/adminFeatures.ts`).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export interface NewFeatureOptions {
  /** Schluessel des Features (`meta.id`, Manifest); nur Kleinbuchstaben und Ziffern, mit Buchstabe am Anfang. */
  slug: string;
  /** Ordnername unter `features/` und Namensbestandteil der Symbole; Standard: `slug` mit grossem Anfangsbuchstaben. */
  ordner?: string;
  /** Anzeigename in Nav, Schnellzugriff und Hilfe; Standard: `ordner`. */
  label?: string;
  /** Icon-Name aus dem DB-UX-Iconset fuer den Schnellzugriff. */
  icon?: string;
}

/** Datei, die das Skript schreibt (`pfad` relativ zum Frontend-Ordner). */
export interface GeplanteDatei {
  pfad: string;
  inhalt: string;
}

export interface FeaturePlan {
  dateien: GeplanteDatei[];
  /** Neuer Inhalt von `src/ts/app/features.ts`. */
  manifest: string;
}

const MANIFEST_PFAD = 'src/ts/app/features.ts';
const SLUG_MUSTER = /^[a-z][a-z0-9]*$/;

/**
 * Baut Dateien und Manifest-Eintrag eines neuen Features (rein, ohne Dateizugriff).
 *
 * @param optionen - Slug, Ordner, Label, Icon.
 * @param manifest - Aktueller Inhalt von `app/features.ts`.
 * @returns Zu schreibende Dateien und neues Manifest.
 * @throws {Error} Bei ungueltigem Slug, doppeltem Feature oder unerwartetem Manifest.
 */
export function planeFeature(optionen: NewFeatureOptions, manifest: string): FeaturePlan {
  const { slug } = optionen;
  if (!SLUG_MUSTER.test(slug))
    throw new Error(`Ungültiger Slug '${slug}': nur Kleinbuchstaben und Ziffern, mit Buchstabe am Anfang.`);

  const ordner = optionen.ordner ?? slug.charAt(0).toUpperCase() + slug.slice(1);
  const label = optionen.label ?? ordner;
  const icon = optionen.icon ?? 'document';
  const meta = `${slug}Meta`;

  // Das Manifest kennt Features nur ueber Meta-Symbol und Ordner (die `id` steht in der `meta.ts`); Ordner ohne Beachtung der Gross-/Kleinschreibung.
  if (
    new RegExp(`\\b${meta}\\b`).test(manifest) ||
    manifest.toLowerCase().includes(`@/features/${ordner.toLowerCase()}/`)
  ) {
    throw new Error(`Feature '${slug}' bzw. Ordner '${ordner}' steht schon im Manifest.`);
  }

  const order = (manifest.match(/^featureRegistry\.define\(/gm)?.length ?? 0) + 1;
  const helpKey = `tab.${slug}`;

  const dateien: GeplanteDatei[] = [
    {
      pfad: `src/ts/features/${ordner}/meta.ts`,
      inhalt: `import type { FeatureMeta } from '@/core/hooks';

/** Eager gehaltene Beschreibung des Features ${label}; kein Feature-Code importieren. */
export const ${meta}: FeatureMeta = {
  id: '${slug}',
  label: '${label}',
  icon: '${icon}',
  order: ${order},
  // Ressourcen (Storage-Key, Tabellen-Id, Monatsermittlung, Backend-Adapter): siehe \`features/EA/meta.ts\`.
  resources: [],
  legacyDefaultOn: false,
  // PDF-Formular: \`pdf: { modus, formular, dateiPraefix }\` plus Teil \`pdf\` (siehe \`features/EA/parts/pdf.ts\`).
  // Events, die auch ohne gemounteten Tab ankommen muessen: \`wakeOn: [...]\` plus Teil \`events\`.
  legacy: {
    lifecycleName: '${ordner}',
    tabKey: '${slug}',
    paneId: '${ordner}',
    rootId: '${slug}-root',
    navId: '${slug}-tab',
    saveButtonId: 'btnSave${ordner}',
  },
  helpKeys: ['${helpKey}'],
};
`,
    },
    {
      pfad: `src/ts/features/${ordner}/${ordner}Tab.tsx`,
      inhalt: `import type { FC } from 'react';

/** Tab-Inhalt des Features ${label}; \`parts/ui.tsx\` mountet ihn in \`#${slug}-root\`. */
export const ${ordner}Tab: FC = () => (
  <div className="container">
    <h2>${label}</h2>
    <p>Neues Feature: hier entsteht der Tab-Inhalt.</p>
  </div>
);
`,
    },
    {
      pfad: `src/ts/features/${ordner}/parts/ui.tsx`,
      inhalt: `import { mount, unmount } from '@/infrastructure/ui';
import type { FeatureParts } from '@/core/hooks';
import { ${ordner}Tab } from '../${ordner}Tab';

/** Tab-Teil des Features ${label}: mountet \`${ordner}Tab\` in \`#${slug}-root\`; ohne Container passiert nichts. */
const ui: FeatureParts['ui'] = {
  mount(): void {
    const container = document.querySelector<HTMLDivElement>('#${slug}-root');
    if (!container) return;

    mount(container, <${ordner}Tab />);
  },
  unmount(): void {
    const container = document.querySelector<HTMLDivElement>('#${slug}-root');
    if (!container) return;

    unmount(container);
  },
};

export default ui;
`,
    },
    {
      pfad: `src/ts/features/${ordner}/parts/help.ts`,
      inhalt: `import type { FeatureParts } from '@/core/hooks';

/** Hilfetexte des Features ${label}: Tab-Hilfe und Hilfe der Dialoge (Schluessel wie \`meta.helpKeys\`). */
const help: FeatureParts['help'] = {
  '${helpKey}': {
    title: '${label}',
    kurzbeschreibung: 'Kurzbeschreibung des Tabs.',
    wasKannIchHierMachen: ['Erste Aufgabe des Tabs'],
  },
};

export default help;
`,
    },
    {
      pfad: `test/${ordner}.test.ts`,
      inhalt: `import { describe, expect, it } from 'bun:test';
import '@/app/features';
import { featureRegistry } from '@/core/hooks';

describe('Feature ${label}', () => {
  it('ist im Manifest angemeldet und laedt seine Teile', async () => {
    expect(featureRegistry.meta('${slug}')?.legacy.rootId).toBe('${slug}-root');

    expect(await featureRegistry.load('${slug}', 'ui')).toBeDefined();
    expect(Object.keys(await featureRegistry.load('${slug}', 'help'))).toEqual(['${helpKey}']);
  });
});
`,
    },
  ];

  const importZeile = `import { ${meta} } from '@/features/${ordner}/meta';\n`;
  const letzterImport = [...manifest.matchAll(/^import .*;\n/gm)].at(-1);
  if (!letzterImport) throw new Error(`Manifest ${MANIFEST_PFAD} hat keine Imports: unerwartetes Format.`);
  const nachImport = letzterImport.index + letzterImport[0].length;

  const definition = `
featureRegistry.define({
  meta: ${meta},
  parts: {
    ui: () => import('@/features/${ordner}/parts/ui'),
    help: () => import('@/features/${ordner}/parts/help'),
  },
});
`;

  return {
    dateien,
    manifest: manifest.slice(0, nachImport) + importZeile + manifest.slice(nachImport).trimEnd() + '\n' + definition,
  };
}

/**
 * Liest einen Options-Wert (`--name wert`) aus den Argumenten.
 *
 * @param args - Kommandozeilenargumente.
 * @param name - Optionsname ohne `--`.
 * @returns Wert oder `undefined`.
 */
function optionWert(args: string[], name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}

/** Kommandozeile: plant das Feature und schreibt Dateien und Manifest (bei `--dry-run` nur Ausgabe). */
function main(): void {
  const args = process.argv.slice(2);
  const slug = args[0]?.startsWith('--') ? undefined : args[0];
  if (!slug) {
    console.error(
      'Aufruf: bun run new-feature <slug> [--ordner <Name>] [--label <Anzeigename>] [--icon <db-icon>] [--dry-run]',
    );
    process.exit(1);
  }

  const wurzel = resolve(import.meta.dirname, '..');
  const manifestPfad = join(wurzel, MANIFEST_PFAD);
  const plan = planeFeature(
    { slug, ordner: optionWert(args, 'ordner'), label: optionWert(args, 'label'), icon: optionWert(args, 'icon') },
    readFileSync(manifestPfad, 'utf8'),
  );

  const vorhanden = plan.dateien.filter(datei => existsSync(join(wurzel, datei.pfad)));
  if (vorhanden.length > 0) {
    console.error(`Abbruch, Dateien existieren schon:\n${vorhanden.map(datei => `  ${datei.pfad}`).join('\n')}`);
    process.exit(1);
  }

  const dryRun = args.includes('--dry-run');
  for (const datei of plan.dateien) {
    console.log(`${dryRun ? 'würde anlegen' : 'angelegt'}: ${datei.pfad}`);
    if (dryRun) continue;
    mkdirSync(dirname(join(wurzel, datei.pfad)), { recursive: true });
    writeFileSync(join(wurzel, datei.pfad), datei.inhalt);
  }
  console.log(`${dryRun ? 'würde ergänzen' : 'ergänzt'}: ${MANIFEST_PFAD}`);
  if (!dryRun) writeFileSync(manifestPfad, plan.manifest);
  console.log(
    'Danach: `bun run format`, Tests und Changelog.',
  );
}

if (import.meta.main) main();
