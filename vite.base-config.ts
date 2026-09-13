import path from 'path';
import pkg from './package.json' with { type: 'json' };
import type { UserConfig } from 'vite';

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

const baseConfig: UserConfig = {
  root: path.resolve(import.meta.dirname, 'src'),
  resolve: {
    alias: {
      '@/components': path.resolve(import.meta.dirname, 'src/ts/components'),
      '@/core': path.resolve(import.meta.dirname, 'src/ts/core'),
      '@/types': path.resolve(import.meta.dirname, 'src/ts/core/types'),
      '@/infrastructure': path.resolve(import.meta.dirname, 'src/ts/infrastructure'),
      '@/features': path.resolve(import.meta.dirname, 'src/ts/features'),
    },
  },
  base: '/',
  define: {
    'import.meta.env.APP_VERSION': JSON.stringify(pkg.version),
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
      plugins: [dropDbSubBrandLogos],
    },
  },
};

export default baseConfig;
