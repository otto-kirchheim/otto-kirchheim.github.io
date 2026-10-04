import path from 'path';
import pkg from './package.json' with { type: 'json' };
import { loadEnv, type UserConfig } from 'vite';

/**
 * `@db-ux/db-theme` deklariert fuer jede DB-Sub-Marke einen eigenen `[data-logo=db-*]`-Block
 * mit `--db-logo-url: url(.../<marke>/logo.svg)`. Vite bundelt jede aufloesbare `url()` --
 * auch aus ungenutzten Selektoren --, dadurch landen 12 Sub-Marken-Logos (~85 KB) in `dist/`
 * und im Precache. Die App ist eine Ein-Marken-App und setzt nie `data-logo`; die Bloecke
 * werden vor der `url()`-Aufloesung entfernt. Das Default-Logo (`:root`-Regel) bleibt.
 */
const dropDbSubBrandLogos = {
  postcssPlugin: 'db-theme-drop-sub-brand-logos',
  Rule(rule: { selector: string; remove: () => void }): void {
    if (/^\[data-logo=db-[a-z-]+]$/.test(rule.selector.trim())) rule.remove();
  },
};

/**
 * DER Schalter fuer die DB-Markenassets: `DB_ASSETS=1` (Prozess-Env oder `.env`, Bun laedt sie automatisch).
 * - an:  DB-Schriften und DB-Icon-Schrift aus `@db-ux/db-theme*` (nur mit `ASSET_*` installiert, DB-Designs-Lizenz),
 *        DB-Neo-Schriften im PDF waehlbar.
 * - aus (Standard): freie Alternativen -- Systemschrift, Material Symbols (Apache 2.0, `src/fonts/material-symbols-db.woff2`),
 *        PDF nur Standard-Schriften. Die DB-Teile bleiben im Code, sie werden nur nicht genutzt.
 * Wirkt ueber den Alias `@asset-satz` (CSS, `src/scss/db-ux.css`) und `import.meta.env.DB_ASSETS` (TS, `shared/lib/dbAssets.ts`).
 */
// `loadEnv` liest `.env`/`.env.local` im Frontend-Ordner selbst (Prozess-Env hat Vorrang) -- nicht darauf verlassen, dass
// der Startweg (`bun run dev`, IDE-Task, anderes Arbeitsverzeichnis) die `.env` in `process.env` laedt.
const DB_ASSETS_ROH = loadEnv('', import.meta.dirname, 'DB_ASSETS').DB_ASSETS ?? '';
export const DB_ASSETS = ['1', 'true'].includes(DB_ASSETS_ROH.trim().toLowerCase());

/** Ersatz fuer die DB-Neo-Familien in der freien Variante (Systemschrift; die DB-Fallbacks Helvetica/Arial folgen dahinter). */
const SYSTEMSCHRIFT = 'system-ui, -apple-system, "Segoe UI", Roboto';

/**
 * Freie Variante (`DB_ASSETS` aus): entfernt die DB-Markenassets schon beim Bauen aus dem Theme-CSS, statt sie nur zu
 * ueberdecken. Die Typografie-Tokens von `@db-ux/db-theme` tragen "DB Neo Screen Sans/Head" fest in ihren Werten
 * (`@property ... initial-value: bolder 1.5rem/... "DB Neo Screen Head", ...`), eine Variable allein reicht nicht.
 * - `@font-face` der DB-Schriften und der DB-Icon-Schriften (`db-default`, `db-filled`) faellt weg -- nichts wird geladen
 *   oder in `dist/` kopiert.
 * - "DB Neo Screen Sans/Head" in allen Werten wird zur Systemschrift.
 * - Das DB-Logo des Themes (`--db-logo-url*` mit Verweis auf `@db-ux/db-theme`) wird `none`; das eigene App-Icon bleibt.
 * Die Icons kommen dann aus `asset-satz.frei.css` (Material Symbols mit DB-Namen).
 */
const freieAssets = {
  postcssPlugin: 'db-assets-frei',
  AtRule: {
    'font-face'(regel: { nodes?: { type: string; prop?: string; value?: string }[]; remove: () => void }): void {
      const familie = regel.nodes?.find(n => n.type === 'decl' && n.prop === 'font-family')?.value ?? '';
      if (/DB Neo Screen|db-default|db-filled/i.test(familie)) regel.remove();
    },
  },
  Declaration(dekl: { prop: string; value: string }): void {
    // Nur das DB-Logo aus dem Theme (`--db-logo-url`/`--db-logo-url-short` -> `@db-ux/db-theme/.../logo.svg`); das eigene
    // App-Icon (`styles.scss`, `--db-logo-url: url('/icons/...')`) bleibt.
    if (dekl.prop.startsWith('--db-logo-url') && dekl.value.includes('db-theme')) {
      dekl.value = 'none';
      return;
    }
    if (dekl.value.includes('DB Neo Screen')) dekl.value = dekl.value.replace(/"DB Neo Screen (?:Sans|Head)"/g, SYSTEMSCHRIFT);
  },
};

const baseConfig: UserConfig = {
  root: path.resolve(import.meta.dirname, 'src'),
  // `.env` liegt im Frontend-Ordner, nicht in `root` (src): so beobachtet Vite sie und startet den Dev-Server bei einer
  // Aenderung (z. B. `DB_ASSETS`) selbst neu. Nur `VITE_`-Variablen gelangen in den Client.
  envDir: import.meta.dirname,
  resolve: {
    alias: {
      '@asset-satz': path.resolve(import.meta.dirname, `src/scss/asset-satz.${DB_ASSETS ? 'db' : 'frei'}.css`),
      '@/types': path.resolve(import.meta.dirname, 'src/ts/shared/types'),
      '@/features': path.resolve(import.meta.dirname, 'src/ts/features'),
      '@/shared': path.resolve(import.meta.dirname, 'src/ts/shared'),
      // Generischer Alias zuletzt: die spezifischen Aliase oben haben Vorrang (erster Treffer gewinnt).
      '@': path.resolve(import.meta.dirname, 'src/ts'),
    },
  },
  base: '/',
  define: {
    'import.meta.env.APP_VERSION': JSON.stringify(pkg.version),
    'import.meta.env.DB_ASSETS': JSON.stringify(DB_ASSETS),
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: 'hidden',
    // Rolldown (Vite 8) bringt lightningcss nicht mit; esbuild ist der unterstuetzte Minifier.
    cssMinify: 'esbuild',
    rollupOptions: {
      output: {
        // Rolldown akzeptiert manualChunks nur als Funktion, nicht als Objekt-Map.
        manualChunks(id: string) {
          if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react';
        },
      },
    },
  },
  preview: {
    port: 8082,
    host: true,
    strictPort: true,
    headers: {
      origin: 'https://otto-kirchheim.github.io',
      referer: 'https://otto-kirchheim.github.io',
    },
  },
  server: {
    port: 8080,
    host: true,
    allowedHosts: ['dev.otto.home64.de'],
    // TLS terminiert der Zoraxy-Proxy (dev.otto.home64.de → :8080); der HMR-Client muss
    // daher wss über Port 443 sprechen. VITE_LOCAL_HMR=1 (bun run dev) für
    // Proxy-losen Betrieb direkt über http://localhost:8080.
    hmr: process.env.VITE_LOCAL_HMR
      ? true
      : { protocol: 'wss', host: 'dev.otto.home64.de', clientPort: 443 },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // `@import` ist in Dart Sass abgekuendigt; `styles.scss` nutzt es noch fuer `raster`.
        silenceDeprecations: ['import'],
        // Erlaubt `@use '@db-ux/...'` ohne relativen Pfad -- die Breakpoints kommen aus
        // `@db-ux/core-foundations/build/styles/screen-sizes`.
        loadPaths: ['node_modules'],
      },
    },
    postcss: {
      plugins: DB_ASSETS ? [dropDbSubBrandLogos] : [dropDbSubBrandLogos, freieAssets],
    },
  },
};

export default baseConfig;
