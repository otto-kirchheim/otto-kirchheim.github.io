/**
 * Legt ein neues Feature-Modul an: Ordner `src/ts/features/<slug>` (`meta.ts`, `ui/<Ordner>Tab.tsx`, `parts/ui.tsx`,
 * `parts/help.ts`), einen Test unter `test/features/<slug>/` und den Eintrag in `src/ts/app/features.ts` (das Manifest ist die einzige
 * Stelle, die Features kennt). Nav-Eintrag, Tab-Pane, Schnellzugriff, Tab-Auswahl in den Einstellungen und Hilfe
 * entstehen danach aus `meta`.
 *
 * Aufruf: `bun run new-feature <slug> [--ordner <Name>] [--label <Anzeigename>] [--icon <db-icon>] [--admin] [--dry-run]`
 *
 * Weitere Teile (`data`, `pdf`, `berechnung`, `einstellungen`, `events`) und Ressourcen (`meta.resources`) kommen von Hand
 * dazu: `features/ea` ist die kleinste vollstaendige Vorlage. Ein neues Datenobjekt braucht zusaetzlich einen Eintrag in
 * `@otto-kirchheim/nebengeld-shared`/Backend (`TResourceKey`).
 *
 * `--admin` legt zusaetzlich einen (leeren) Admin-Ordner an (`features/Admin/features/<slug>/{index,katalog}.ts`) und
 * traegt ihn im Admin-Manifest (`features/Admin/adminFeatures.ts`) ein; Ressourcen, Verweise und PDF-Formular darin
 * bleiben von Hand zu befuellen (`features/Admin/features/ea` als Vorlage). Ohne `--admin` erscheint das Feature im
 * Admin-Ressourcenbrowser ueber den generischen Fallback aus `meta.resources`.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export interface NewFeatureOptions {
  /** Schluessel des Features (`meta.id`, Manifest); nur Kleinbuchstaben und Ziffern, mit Buchstabe am Anfang. */
  slug: string;
  /** Namensbestandteil der Symbole (Tab-Komponente, Ids); Standard: `slug` mit grossem Anfangsbuchstaben. Der Ordner heisst wie `slug`. */
  ordner?: string;
  /** Anzeigename in Nav, Schnellzugriff und Hilfe; Standard: `ordner`. */
  label?: string;
  /** Icon-Name aus dem DB-UX-Iconset fuer den Schnellzugriff. */
  icon?: string;
  /** Legt zusaetzlich einen leeren Admin-Ordner an und traegt ihn im Admin-Manifest ein. */
  admin?: boolean;
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
  /** Neuer Inhalt von `src/ts/features/Admin/adminFeatures.ts`; nur bei `optionen.admin`. */
  adminManifest?: string;
}

const MANIFEST_PFAD = 'src/ts/app/features.ts';
const ADMIN_MANIFEST_PFAD = 'src/ts/features/Admin/adminFeatures.ts';
const SLUG_MUSTER = /^[a-z][a-z0-9]*$/;

/**
 * Baut Dateien und Manifest-Eintrag eines neuen Features (rein, ohne Dateizugriff).
 *
 * @param optionen - Slug, Ordner, Label, Icon, `admin`.
 * @param manifest - Aktueller Inhalt von `app/features.ts`.
 * @param adminManifest - Aktueller Inhalt von `features/Admin/adminFeatures.ts`; nur noetig bei `optionen.admin`.
 * @returns Zu schreibende Dateien und neue Manifeste.
 * @throws {Error} Bei ungueltigem Slug, doppeltem Feature, unerwartetem Manifest oder `admin: true` ohne `adminManifest`.
 */
export function planeFeature(optionen: NewFeatureOptions, manifest: string, adminManifest?: string): FeaturePlan {
  const { slug } = optionen;
  if (optionen.admin && adminManifest === undefined) {
    throw new Error('optionen.admin verlangt den aktuellen Inhalt von adminManifest.');
  }
  if (!SLUG_MUSTER.test(slug))
    throw new Error(`Ungültiger Slug '${slug}': nur Kleinbuchstaben und Ziffern, mit Buchstabe am Anfang.`);

  const ordner = optionen.ordner ?? slug.charAt(0).toUpperCase() + slug.slice(1);
  const label = optionen.label ?? ordner;
  const icon = optionen.icon ?? 'document';
  const meta = `${slug}Meta`;

  // Das Manifest kennt Features nur ueber Meta-Symbol und Ordner (die `id` steht in der `meta.ts`); Ordner ohne Beachtung der Gross-/Kleinschreibung.
  if (
    new RegExp(`\\b${meta}\\b`).test(manifest) ||
    manifest.toLowerCase().includes(`@/features/${ordner.toLowerCase()}/`) ||
    manifest.includes(`@/features/${slug}/`)
  ) {
    throw new Error(`Feature '${slug}' bzw. Ordner '${ordner}' steht schon im Manifest.`);
  }

  const order = (manifest.match(/^featureRegistry\.define\(/gm)?.length ?? 0) + 1;
  const helpKey = `tab.${slug}`;

  const dateien: GeplanteDatei[] = [
    {
      pfad: `src/ts/features/${slug}/meta.ts`,
      inhalt: `import type { FeatureMeta } from '@/core/hooks';

/** Eager gehaltene Beschreibung des Features ${label}; kein Feature-Code importieren. */
export const ${meta}: FeatureMeta = {
  id: '${slug}',
  label: '${label}',
  icon: '${icon}',
  order: ${order},
  // Ressourcen (Storage-Key, Tabellen-Id, Monatsermittlung, Backend-Adapter): siehe \`features/ea/meta.ts\`.
  resources: [],
  legacyDefaultOn: false,
  // PDF-Formular: \`pdf: { modus, formular, dateiPraefix }\` plus Teil \`pdf\` (siehe \`features/ea/parts/pdf.ts\`).
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
      pfad: `src/ts/features/${slug}/ui/${ordner}Tab.tsx`,
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
      pfad: `src/ts/features/${slug}/parts/ui.tsx`,
      inhalt: `import { mount, unmount } from '@/infrastructure/ui';
import type { FeatureParts } from '@/core/hooks';
import { ${ordner}Tab } from '../ui/${ordner}Tab';

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
      pfad: `src/ts/features/${slug}/parts/help.ts`,
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
      pfad: `test/features/${slug}/${ordner}.test.ts`,
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

  if (optionen.admin) {
    dateien.push(
      {
        pfad: `src/ts/features/Admin/features/${slug}/index.ts`,
        inhalt: `import type { AdminFeature } from '../../adminFeatures';

/**
 * Admin-Anteile von ${label}: Ressourcenbrowser, Verweise, PDF-Formular und Dashboard-Statistik von Hand ergaenzen
 * (\`features/Admin/features/ea\` als vollstaendige Vorlage). Ohne eigene Ressourcen erscheint hier nichts -- der
 * Ressourcenbrowser faellt dann auf den generischen Fallback aus \`meta.resources\` zurueck.
 */
const adminFeature: AdminFeature = {
  id: '${slug}',
  resources: [],
  statsRows: [],
};

export default adminFeature;
`,
      },
      {
        pfad: `src/ts/features/Admin/features/${slug}/katalog.ts`,
        inhalt: `import type { FeatureKatalog } from '../../components/FormularEditor/katalogTypen';

/**
 * Katalog-Beitrag von ${label} fuer den Formular-Editor -- nur noetig, wenn das Feature ein PDF-Formular bekommt: dann
 * \`FormularCode\` (\`katalogTypen.ts\`) und \`FEATURE_KATALOGE\` (\`FormularEditor/datenKatalog.ts\`) um '${slug}' ergaenzen.
 * Sonst kann diese Datei geloescht werden.
 */
const katalog: FeatureKatalog = {
  zeilenFelder: [],
  zeilenQuellen: [],
};

export default katalog;
`,
      },
    );
  }

  const importZeile = `import { ${meta} } from '@/features/${slug}/meta';\n`;
  const letzterImport = [...manifest.matchAll(/^import .*;\n/gm)].at(-1);
  if (!letzterImport) throw new Error(`Manifest ${MANIFEST_PFAD} hat keine Imports: unerwartetes Format.`);
  const nachImport = letzterImport.index + letzterImport[0].length;

  const definition = `
featureRegistry.define({
  meta: ${meta},
  parts: {
    ui: () => import('@/features/${slug}/parts/ui'),
    help: () => import('@/features/${slug}/parts/help'),
  },
});
`;

  const plan: FeaturePlan = {
    dateien,
    manifest: manifest.slice(0, nachImport) + importZeile + manifest.slice(nachImport).trimEnd() + '\n' + definition,
  };

  if (optionen.admin) {
    const marker = 'const ADMIN_MANIFEST: AdminManifest = {';
    const start = adminManifest!.indexOf(marker);
    const ende = start >= 0 ? adminManifest!.indexOf('\n};', start) : -1;
    if (start < 0 || ende < 0) throw new Error(`Manifest ${ADMIN_MANIFEST_PFAD}: 'ADMIN_MANIFEST' nicht gefunden.`);
    // `ende` zeigt auf den Zeilenumbruch vor `};`; die neue Zeile kommt dahinter, damit der letzte bestehende
    // Eintrag sein eigenes Zeilenende behaelt (sonst landen beide Eintraege in einer Zeile).
    const zeile = `  ${slug}: () => import('./features/${slug}'),\n`;
    plan.adminManifest = adminManifest!.slice(0, ende + 1) + zeile + adminManifest!.slice(ende + 1);
  }

  return plan;
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
      'Aufruf: bun run new-feature <slug> [--ordner <Name>] [--label <Anzeigename>] [--icon <db-icon>] [--admin] [--dry-run]',
    );
    process.exit(1);
  }

  const admin = args.includes('--admin');
  const wurzel = resolve(import.meta.dirname, '..');
  const manifestPfad = join(wurzel, MANIFEST_PFAD);
  const adminManifestPfad = join(wurzel, ADMIN_MANIFEST_PFAD);
  const plan = planeFeature(
    {
      slug,
      ordner: optionWert(args, 'ordner'),
      label: optionWert(args, 'label'),
      icon: optionWert(args, 'icon'),
      admin,
    },
    readFileSync(manifestPfad, 'utf8'),
    admin ? readFileSync(adminManifestPfad, 'utf8') : undefined,
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
  if (plan.adminManifest !== undefined) {
    console.log(`${dryRun ? 'würde ergänzen' : 'ergänzt'}: ${ADMIN_MANIFEST_PFAD}`);
    if (!dryRun) writeFileSync(adminManifestPfad, plan.adminManifest);
  }
  console.log('Danach: `bun run format`, Tests und Changelog.');
}

if (import.meta.main) main();
