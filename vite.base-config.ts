import path from 'path';
import { version } from './package.json';
import type { UserConfig } from 'vite';

const baseConfig: UserConfig = {
  root: path.resolve(__dirname, 'src'),
  resolve: {
    alias: {
      '~bootstrap': path.resolve(__dirname, 'node_modules/bootstrap'),
      '~material-icons': path.resolve(__dirname, 'node_modules/material-icons'),
      '@/components': path.resolve(__dirname, 'src/ts/components'),
      '@/core': path.resolve(__dirname, 'src/ts/core'),
      '@/types': path.resolve(__dirname, 'src/ts/core/types'),
      '@/infrastructure': path.resolve(__dirname, 'src/ts/infrastructure'),
      '@/features': path.resolve(__dirname, 'src/ts/features'),
    },
  },
  base: '/',
  define: {
    'import.meta.env.APP_VERSION': JSON.stringify(version),
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: 'hidden',
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
    hmr: true,
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['import', 'color-functions', 'global-builtin', 'if-function'],
      },
    },
  },
};

export default baseConfig;
