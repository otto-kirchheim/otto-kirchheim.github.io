import { defineConfig, mergeConfig } from 'vitest/config';
import base from './vite.base-config';
import path from 'path';

export default mergeConfig(
  base,
  defineConfig({
    root: path.resolve(__dirname),
    test: {
      include: ['test/**/*.test.{ts,tsx}'],
      exclude: [
        '.github/*',
        '.husky/*',
        'dist',
        'dev-dist',
        'src/node_modules',
        'node_modules',
        'dist',
        '.idea',
        '.git',
        '.cache',
      ],
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./test/setupVitest.ts'],
      environmentOptions: {
        jsxImportSource: 'preact',
      },
      coverage: {
        provider: 'v8',
        reportsDirectory: './coverage',
        reporter: ['text', 'html', 'lcov', 'cobertura'],
        include: ['src/ts/**/*.{ts,tsx}'],
      },
    },
  }),
);
