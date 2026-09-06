import { defineConfig } from 'vite';
import base from './vite.base-config.ts';
import react from '@vitejs/plugin-react';
import UnpluginInjectPreload from 'unplugin-inject-preload/vite';
import { compression } from 'vite-plugin-compression2';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => ({
  ...base,
  plugins: [
    react(),
    // Zoraxy leitet https://dev.otto.home64.de auf diesen Dev-Server; Vite kennt den
    // Proxy nicht und würde die URL sonst nicht anzeigen. Nur im Proxy-HMR-Modus
    // (ohne VITE_LOCAL_HMR, siehe vite.base-config.ts) relevant.
    !process.env.VITE_LOCAL_HMR && {
      name: 'print-proxy-url',
      apply: 'serve' as const,
      configureServer(server) {
        const printUrls = server.printUrls.bind(server);
        server.printUrls = () => {
          printUrls();
          server.config.logger.info('  ➜  Proxy:   \x1b[36mhttps://dev.otto.home64.de/\x1b[0m');
        };
      },
    },
    compression({
      exclude: /\.(woff|woff2|map|nojekyll|png)$/i,
      skipIfLargerOrEqual: true,
    }),
    UnpluginInjectPreload({
      files: [
        {
          // Fliesstext-Schnitt der DB-Screen-Sans; die uebrigen Schnitte laedt der Browser
          // erst, wenn sie wirklich gebraucht werden.
          outputMatch: /dbneoscreensans-regular-[A-Za-z-0-9_]*\.woff2$/,
          attributes: {
            crossOrigin: 'anonymous',
          },
        },
      ],
    }),
    VitePWA({
      strategies: 'generateSW',
      injectRegister: 'auto',
      registerType: 'autoUpdate',
      manifest: {
        name: 'DB Nebengeld',
        short_name: 'Nebengeld',
        start_url: '/',
        display_override: ['window-controls-overlay', 'standalone', 'browser'],
        display: 'standalone',
        description: 'Generiert PDF von Bereitschaft, EWT & Nebenbezüge Zetteln',
        lang: 'de',
        dir: 'ltr',
        theme_color: '#212529',
        background_color: '#000000',
        orientation: 'any',
        scope: '/',
        id: '/',
        categories: ['business', 'productivity', 'utilities'],
        icons: [
          {
            src: 'icons/16x16-icon.png',
            type: 'image/png',
            sizes: '16x16',
            purpose: 'any',
          },
          {
            src: 'icons/29x29-icon.png',
            type: 'image/png',
            sizes: '29x29',
            purpose: 'any',
          },
          {
            src: 'icons/32x32-icon.png',
            type: 'image/png',
            sizes: '32x32',
            purpose: 'any',
          },
          {
            src: 'icons/60x60-icon.png',
            type: 'image/png',
            sizes: '60x60',
            purpose: 'any',
          },
          {
            src: 'icons/64x64-icon.png',
            type: 'image/png',
            sizes: '64x64',
            purpose: 'any',
          },
          {
            src: 'icons/72x72-icon.png',
            type: 'image/png',
            sizes: '72x72',
            purpose: 'any',
          },
          {
            src: 'icons/96x96-icon.png',
            type: 'image/png',
            sizes: '96x96',
            purpose: 'any',
          },
          {
            src: 'icons/100x100-icon.png',
            type: 'image/png',
            sizes: '100x100',
            purpose: 'any',
          },
          {
            src: 'icons/107x107-icon.png',
            type: 'image/png',
            sizes: '107x107',
            purpose: 'any',
          },
          {
            src: 'icons/120x120-icon.png',
            type: 'image/png',
            sizes: '120x120',
            purpose: 'any',
          },
          {
            src: 'icons/128x128-icon.png',
            type: 'image/png',
            sizes: '128x128',
            purpose: 'any',
          },
          {
            src: 'icons/144x144-icon.png',
            type: 'image/png',
            sizes: '144x144',
            purpose: 'any',
          },
          {
            src: 'icons/167x167-icon.png',
            type: 'image/png',
            sizes: '167x167',
            purpose: 'any',
          },
          {
            src: 'icons/192x192-icon.png',
            type: 'image/png',
            sizes: '192x192',
            purpose: 'any',
          },
          {
            src: 'icons/256x256-icon.png',
            type: 'image/png',
            sizes: '256x256',
            purpose: 'any',
          },
          {
            src: 'icons/512x512-icon.png',
            type: 'image/png',
            sizes: '512x512',
            purpose: 'any',
          },
          {
            src: 'icons/1024x1024-icon.png',
            type: 'image/png',
            sizes: '1024x1024',
            purpose: 'any',
          },
          {
            src: 'icons/maskable_icon_x48.png',
            type: 'image/png',
            sizes: '48x48',
            purpose: 'maskable',
          },
          {
            src: 'icons/maskable_icon_x72.png',
            type: 'image/png',
            sizes: '72x72',
            purpose: 'maskable',
          },
          {
            src: 'icons/maskable_icon_x96.png',
            type: 'image/png',
            sizes: '96x96',
            purpose: 'maskable',
          },
          {
            src: 'icons/maskable_icon_x128.png',
            type: 'image/png',
            sizes: '128x128',
            purpose: 'maskable',
          },
          {
            src: 'icons/maskable_icon_x192.png',
            type: 'image/png',
            sizes: '192x192',
            purpose: 'maskable',
          },
          {
            src: 'icons/maskable_icon_x384.png',
            type: 'image/png',
            sizes: '384x384',
            purpose: 'maskable',
          },
          {
            src: 'icons/maskable_icon_x512.png',
            type: 'image/png',
            sizes: '512x512',
            purpose: 'maskable',
          },
        ],
        screenshots: [
          {
            src: 'screenshots/1280x800-screenshot.png',
            sizes: '1280x800',
            type: 'image/png',
          },
          {
            src: 'screenshots/750x1334-screenshot.png',
            sizes: '750x1334',
            type: 'image/png',
          },
        ],
        shortcuts: [
          {
            name: 'Bereitschaft',
            url: '/#Bereitschaft',
            description: 'Bereitschafts-Zettel',
            icons: [
              {
                src: 'icons/96x96-icon.png',
                type: 'image/png',
                sizes: '96x96',
                purpose: 'any',
              },
            ],
          },
          {
            name: 'EWT',
            url: '/#EWT',
            description: 'EWT-Zettel',
            icons: [
              {
                src: 'icons/96x96-icon.png',
                type: 'image/png',
                sizes: '96x96',
                purpose: 'any',
              },
            ],
          },
          {
            name: 'Nebenbezüge',
            url: '/#Neben',
            description: 'Nebenbezüge-Zettel',
            icons: [
              {
                src: 'icons/96x96-icon.png',
                type: 'image/png',
                sizes: '96x96',
                purpose: 'any',
              },
            ],
          },
          {
            name: 'Berechnung',
            url: '/#Berechnung',
            description: 'Berechnung',
            icons: [
              {
                src: 'icons/96x96-icon.png',
                type: 'image/png',
                sizes: '96x96',
                purpose: 'any',
              },
            ],
          },
          {
            name: 'Einstellungen',
            url: '/#Einstellungen',
            description: 'Einstellungen',
            icons: [
              {
                src: 'icons/96x96-icon.png',
                type: 'image/png',
                sizes: '96x96',
                purpose: 'any',
              },
            ],
          },
          {
            name: 'Start',
            url: '/',
            description: 'Start',
            icons: [
              {
                src: 'icons/96x96-icon.png',
                type: 'image/png',
                sizes: '96x96',
                purpose: 'any',
              },
            ],
          },
        ],
      },
      // Der Service Worker im Dev-Modus liefert waehrend der DB-UX-Migration alte Stylesheets
      // aus, obwohl Vite laengst neue schickt -- Fehlerbilder ueberleben dann Reload und
      // Server-Neustart. Deshalb standardmaessig aus; fuer PWA-Tests `PWA_DEV=true bun run start`.
      devOptions: {
        enabled: process.env['PWA_DEV'] === 'true',
        type: 'module',
        suppressWarnings: true,
      },
      workbox: {
        disableDevLogs: true,
        cleanupOutdatedCaches: true,
        sourcemap: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json,webmanifest}'],
        globIgnores: [
          'icons/*',
          // Nur die drei Fliesstext-Schnitte der DB-Screen-Sans vorab cachen. Kursive,
          // Black-, Digital- und Head-Schnitte sowie die DB-Icon-Fonts (db-*.woff2) haengen
          // sonst ~1,7 MB an den Precache; sie kommen ueber das CacheFirst-Runtime-Caching
          // beim ersten echten Gebrauch.
          'assets/dbneoscreenhead-*.woff2',
          'assets/dbneoscreensans-*italic*.woff2',
          'assets/dbneoscreensans-black*.woff2',
          'assets/dbneoscreensans-digital*.woff2',
          'assets/db-*.woff2',
        ],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /\/api\/v2\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 50, maxAgeSeconds: 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\.(?:js|css|png|jpg|jpeg|svg|woff2|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
}));
